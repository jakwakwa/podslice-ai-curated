import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { extractUserEpisodeDuration } from "@/app/(protected)/admin/audio-duration/duration-extractor";
import { aiConfig } from "@/config/ai";
import { getVoiceById } from "@/lib/constants/voices";
import {
	combineAndUploadWavChunks,
	sanitizeSpeakerLabels,
	uploadBufferToPrimaryBucket,
} from "@/lib/inngest/episode-shared";
import { generateElevenLabsTts } from "@/lib/inngest/utils/elevenlabs";
import { generateTtsAudio, generateText as genText } from "@/lib/inngest/utils/genai";
import { generateTextWithOpenAI } from "@/lib/inngest/utils/openai";
import { generateFinancialAnalysis } from "@/lib/inngest/utils/summary";
import { prisma } from "@/lib/prisma";
import {
	getSummaryLengthConfig,
	type SummaryLengthOption,
} from "@/lib/types/summary-length";
import { inngest } from "./client";

// Use shared generateTtsAudio directly for multi-speaker; voice selection via param
async function ttsWithVoice(text: string, voiceName: string): Promise<Buffer> {
	return generateTtsAudio(
		`Read the following lines as ${voiceName}, in an engaging podcast style. Read only the spoken words - ignore any sound effects, stage directions, or non-spoken elements.\n\n${text}`,
		{ voiceName }
	);
}

type DialogueLine = { speaker: "A" | "B"; text: string };

const DialogueSchema = z.object({
	speaker: z.enum(["A", "B"]),
	text: z.string().min(1),
});

function stripMarkdownJsonFences(input: string): string {
	return input.replace(/```json\n?|\n?```/g, "").trim();
}

function coerceJsonArray(input: string): DialogueLine[] {
	const attempts: Array<() => unknown> = [
		() => JSON.parse(input),
		() => JSON.parse(input.match(/\[[\s\S]*\]/)?.[0] || "[]"),
		() => JSON.parse(stripMarkdownJsonFences(input)),
	];
	for (const attempt of attempts) {
		try {
			const parsed = attempt();
			return z.array(DialogueSchema).parse(parsed);
		} catch {}
	}
	throw new Error("Failed to parse dialogue script");
}

export const generateUserEpisodeMulti = inngest.createFunction(
	{
		id: "generate-user-episode-multi-workflow",
		name: "Generate User Episode Multi-Speaker Workflow",
		retries: 2,
		onFailure: async ({ event, step }) => {
			const { userEpisodeId } = (
				event as unknown as { data: { event: { data: { userEpisodeId: string } } } }
			).data.event.data;
			if (!userEpisodeId) {
				console.error(
					"[USER_EPISODE_MULTI_FAILED] Missing userEpisodeId in failure event",
					event
				);
				return;
			}
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { status: "FAILED" },
			});
			try {
				const episode = await prisma.userEpisode.findUnique({
					where: { episode_id: userEpisodeId },
					select: { episode_title: true, user_id: true },
				});
				if (episode) {
					const user = await prisma.user.findUnique({
						where: { user_id: episode.user_id },
						select: { in_app_notifications: true },
					});
					if (user?.in_app_notifications) {
						await prisma.notification.create({
							data: {
								user_id: episode.user_id,
								type: "episode_failed",
								message: `We're sorry — we hit a technical issue while generating your episode "${episode.episode_title}". Please try again later. If it keeps happening, contact support.`,
							},
						});
					}
					// Trigger email via separate function
					await step.sendEvent("send-failed-email", {
						name: "episode.failed.email",
						data: { userEpisodeId },
					});
				}
			} catch (notifyError) {
				console.error("[USER_EPISODE_FAILED_NOTIFY]", notifyError);
			}
		},
	},
	{ event: "user.episode.generate.multi.requested" },
	async ({ event, step }) => {
		const {
			userEpisodeId,
			voiceA,
			voiceB,
			useShortEpisodesOverride,
			summaryLength = "MEDIUM",
		} = event.data as {
			userEpisodeId: string;
			voiceA: string;
			voiceB: string;
			useShortEpisodesOverride?: boolean;
			summaryLength?: SummaryLengthOption;
		};

		await step.run("update-status-to-processing", async () => {
			return await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					status: "PROCESSING",
					progress_message: "Getting started—preparing your multi-speaker episode...",
				},
			});
		});

		const transcript = await step.run("get-transcript", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { progress_message: "Loading your video transcript..." },
			});

			const episode = await prisma.userEpisode.findUnique({
				where: { episode_id: userEpisodeId },
			});
			if (!episode) throw new Error(`UserEpisode with ID ${userEpisodeId} not found.`);
			if (!episode.transcript)
				throw new Error(`No transcript found for episode ${userEpisodeId}`);
			return episode.transcript;
		});

		const _isShort = useShortEpisodesOverride ?? aiConfig.useShortEpisodes;

		// Step 2: Generate Financial Analysis & Content (Single Source of Truth)
		const summary = await step.run("generate-financial-analysis", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					progress_message:
						"Analyzing content, extracting insights, and writing script...",
				},
			});

			const analysis = await generateFinancialAnalysis(transcript);

			// Format summary as Markdown
			const summaryMarkdown = `## Executive Brief
${analysis.writtenContent.executiveBrief}

## Investment Implications
${analysis.writtenContent.investmentImplications}`;

			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					summary: summaryMarkdown,
					intelligence: analysis.structuredData as unknown as Prisma.InputJsonValue,
					sentiment_score: analysis.structuredData.sentimentScore,
					// sentiment and mentioned_assets are deprecated for B2B but we keep the score for basic sorting if needed
				},
			});

			return summaryMarkdown;
		});

		const duetLines = await step.run("generate-duet-script", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					progress_message: "Crafting an engaging two-host conversation script...",
				},
			});

			const modelName2 = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";

			// Get word/minute targets based on selected length
			const lengthConfig = getSummaryLengthConfig(summaryLength);
			const [minWords, maxWords] = lengthConfig.words;
			const [minMinutes, maxMinutes] = lengthConfig.minutes;

			const scriptPrompt = `Task: Based on the SUMMARY below, write a ${minWords}-${maxWords} word (approximately ${minMinutes}-${maxMinutes} minutes) two-host podcast conversation where Podslice hosts A and B explain the highlights to listeners. Alternate speakers naturally.\n\nIdentity & framing:\n- Hosts are from Podslice and are commenting on someone else's content.\n- They do NOT reenact or impersonate the original speakers.\n- They present key takeaways, context, and insights.\n\nBrand opener (must be the first line, exactly, spoken by A):\n"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."\n\nConstraints:\n- No stage directions, no timestamps, no sound effects.\n- Spoken dialogue only.\n- Natural, engaging tone.\n- Avoid claiming ownership of original content; refer to it as "the video" or "the episode."\n- Do not include any speaker names, labels, or direct addresses in the text (e.g., no 'A', 'B', 'Hey Host', 'What do you think?'). The hosts should discuss the content without referencing each other by name or label.\n\nOutput ONLY valid JSON array of objects with fields: speaker ("A" or "B") and text (string). The text MUST NOT include any speaker names or labels; only the spoken words. No markdown.\n\nSUMMARY:\n${summary}`;

			let rawScript: string;
			try {
				rawScript = await genText(modelName2, scriptPrompt);
			} catch (error) {
				console.warn(
					"[FALLBACK] Gemini script generation failed, attempting OpenAI fallback...",
					error
				);
				try {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: {
							progress_message: "Using backup service to write your script...",
						},
					});
					rawScript = await generateTextWithOpenAI(scriptPrompt, {
						temperature: 0.7,
					});
				} catch (backupError) {
					console.error("[FALLBACK] OpenAI script generation also failed", backupError);
					throw backupError; // Fail the entire workflow since both providers failed
				}
			}
			return coerceJsonArray(rawScript);
		});

		// TTS for all dialogue lines - Upload chunks to GCS immediately
		const lineChunkUrls = await step.run(
			"generate-and-upload-dialogue-audio",
			async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						progress_message: "Converting dialogue to audio with your selected voices...",
					},
				});

				const urls: string[] = [];
				const tempPath = `user-episodes/${userEpisodeId}/temp-dialogue-chunks`;

				for (let i = 0; i < duetLines.length; i++) {
					const line = duetLines[i];
					console.log(
						`[TTS] Generating and uploading line ${i + 1}/${duetLines.length} (Speaker ${line?.speaker})`
					);

					// Update progress with current line
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: {
							progress_message: `Generating dialogue audio (line ${i + 1} of ${duetLines.length})...`,
						},
					});

					if (!line) {
						console.warn(`[TTS] Skipping undefined line at index ${i}`);
						continue;
					}
					const sanitizedText = sanitizeSpeakerLabels(line.text);
					let audio: Buffer;
					try {
						const voice = line.speaker === "A" ? voiceA : voiceB;
						audio = await ttsWithVoice(sanitizedText, voice);
					} catch (error) {
						console.warn(
							`[TTS] Gemini TTS failed for line ${i + 1}/${duetLines.length} (Speaker ${line.speaker}). Attempting backup with ElevenLabs...`,
							error
						);
						try {
							// Look up voice config for dynamic ElevenLabs fallback
							const selectedVoiceId = line.speaker === "A" ? voiceA : voiceB;
							const voiceConfig = getVoiceById(selectedVoiceId);
							const elevenLabsVoiceId =
								voiceConfig?.elevenLabsId ?? "ucgJ8SdlW1CZr9MIm8BP";
							audio = await generateElevenLabsTts(sanitizedText, elevenLabsVoiceId);
						} catch (backupError) {
							console.error(
								`[TTS] Backup ElevenLabs TTS also failed for line ${i + 1}/${duetLines.length}`,
								backupError
							);
							throw backupError; // Fail the entire workflow since both providers failed
						}
					}
					const chunkFileName = `${tempPath}/line-${i}.wav`;
					const gcsUrl = await uploadBufferToPrimaryBucket(audio, chunkFileName);
					urls.push(gcsUrl);
				}

				console.log(`[TTS] Uploaded ${urls.length} dialogue chunks to GCS`);
				return urls;
			}
		);

		const { gcsAudioUrl, durationSeconds } = await step.run(
			"download-combine-upload-multi-voice",
			async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						progress_message: "Stitching dialogue segments into your final episode...",
					},
				});

				// Download chunks from GCS, combine them, and upload final file
				const { getStorageReader, parseGcsUri } = await import("@/lib/inngest/utils/gcs");
				const storageReader = getStorageReader();

				console.log(
					`[COMBINE] Downloading ${lineChunkUrls.length} dialogue chunks from GCS`
				);
				const lineAudioBase64: string[] = [];

				for (const gcsUrl of lineChunkUrls) {
					const parsed = parseGcsUri(gcsUrl);
					if (!parsed) throw new Error(`Invalid GCS URI: ${gcsUrl}`);
					const [buffer] = await storageReader
						.bucket(parsed.bucket)
						.file(parsed.object)
						.download();
					lineAudioBase64.push(buffer.toString("base64"));
				}

				console.log(`[COMBINE] Downloaded ${lineAudioBase64.length} chunks, combining`);
				const fileName = `user-episodes/${userEpisodeId}-duet-${Date.now()}.wav`;
				const { finalBuffer, durationSeconds } = await combineAndUploadWavChunks(
					lineAudioBase64,
					fileName
				);
				const gcsUrl = await uploadBufferToPrimaryBucket(finalBuffer, fileName);

				// Clean up temporary chunk files
				try {
					for (const chunkUrl of lineChunkUrls) {
						const parsed = parseGcsUri(chunkUrl);
						if (parsed)
							await storageReader
								.bucket(parsed.bucket)
								.file(parsed.object)
								.delete()
								.catch(() => {});
					}
				} catch (cleanupError) {
					console.warn(`[CLEANUP] Failed to delete temp chunks:`, cleanupError);
				}

				return { gcsAudioUrl: gcsUrl, durationSeconds };
			}
		);

		await step.run("finalize-episode", async () => {
			return await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					gcs_audio_url: gcsAudioUrl,
					status: "COMPLETED",
					duration_seconds: durationSeconds,
					transcript: duetLines.map(line => sanitizeSpeakerLabels(line.text)).join(" "),
					progress_message: null, // Clear progress message on completion
				},
			});
		});

		// Extract duration after episode is finalized
		await step.run("extract-duration", async () => {
			const result = await extractUserEpisodeDuration(userEpisodeId);
			if (!result.success) {
				console.warn(`[DURATION_EXTRACTION] Failed to extract duration: ${result.error}`);
			}
			return result;
		});

		await step.run("notify-user-in-app", async () => {
			const episode = await prisma.userEpisode.findUnique({
				where: { episode_id: userEpisodeId },
				select: { episode_id: true, episode_title: true, user_id: true },
			});
			if (!episode) return;
			const user = await prisma.user.findUnique({
				where: { user_id: episode.user_id },
				select: { in_app_notifications: true },
			});
			if (user?.in_app_notifications) {
				await prisma.notification.create({
					data: {
						user_id: episode.user_id,
						type: "episode_ready",
						message: `Your multi-speaker episode "${episode.episode_title}" is ready to listen.`,
					},
				});
			}
		});

		// Trigger email via separate function (runs in Next.js runtime)
		await step.sendEvent("send-ready-email", {
			name: "episode.ready.email",
			data: { userEpisodeId },
		});

		return {
			message: "Multi-speaker episode generation completed",
			userEpisodeId,
			voiceA,
			voiceB,
		};
	}
);
