import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";
import { z } from "zod";
import { extractUserEpisodeDuration } from "@/app/(protected)/admin/audio-duration/duration-extractor";
import { ensureGoogleCredentialsForADC } from "@/lib/google-credentials";
import {
	combineAndUploadWavChunks,
	generateSingleSpeakerTts,
	getTtsChunkWordLimit,
	splitScriptIntoChunks,
	uploadBufferToPrimaryBucket,
} from "@/lib/inngest/episode-shared";
import { generateTtsAudio } from "@/lib/inngest/utils/genai";
import { prisma } from "@/lib/prisma";
import { getSummaryLengthConfig } from "@/lib/types/summary-length";
import { inngest } from "./client";

const ALLOWED_SOURCES = ["guardian", "aljazeera", "worldbank", "un", "stocks"] as const;
const ALLOWED_TOPICS = [
	"technology",
	"business",
	"politics",
	"world",
	"tesla",
	"finance",
] as const;

const PayloadSchema = z.object({
	userEpisodeId: z.string(),
	sources: z.array(z.enum(ALLOWED_SOURCES)),
	topic: z.enum(ALLOWED_TOPICS),
	generationMode: z.enum(["single", "multi"]).default("single"),
	voiceA: z.string().optional(),
	voiceB: z.string().optional(),
	summaryLength: z.enum(["SHORT", "MEDIUM", "LONG"]).default("MEDIUM"),
});

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

export const generateUserNewsEpisode = inngest.createFunction(
	{
		id: "generate-user-news-episode-workflow",
		name: "Generate User News Episode Workflow",
		retries: 2,
		onFailure: async ({ event, step }) => {
			const { userEpisodeId } = (
				event as unknown as { data: { event: { data: { userEpisodeId?: string } } } }
			).data.event.data;
			if (!userEpisodeId) return;
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { status: "FAILED" },
			});
			try {
				const episode = await prisma.userEpisode.findUnique({
					where: { episode_id: userEpisodeId },
					select: { episode_title: true, user_id: true },
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
							type: "episode_failed",
							message: `We're sorry — we hit a technical issue while generating your episode "${episode.episode_title}". Please try again later.`,
						},
					});
				}
				// Trigger email via separate function
				await step.sendEvent("send-failed-email", {
					name: "episode.failed.email",
					data: { userEpisodeId },
				});
			} catch (err) {
				console.error("[USER_NEWS_FAILED_NOTIFY]", err);
			}
		},
	},
	{ event: "user.news.generate.requested" },
	async ({ event, step }) => {
		const {
			userEpisodeId,
			sources,
			topic,
			generationMode,
			voiceA,
			voiceB,
			summaryLength,
		} = PayloadSchema.parse(event.data);

		await step.run("mark-processing", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					status: "PROCESSING",
					progress_message: "Starting your news episode—gathering latest updates...",
				},
			});
		});

		const modelId = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
		const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
		const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

		if (!projectId) {
			throw new Error(
				"GOOGLE_CLOUD_PROJECT_ID environment variable is required for Vertex AI"
			);
		}

		// Ensure GOOGLE_APPLICATION_CREDENTIALS supports JSON-in-env on Vercel (preview/production)
		ensureGoogleCredentialsForADC();

		// Initialize Vertex AI provider with project and location
		const vertex = createVertex({
			project: projectId,
			location: location,
		});

		const allowedDomains = {
			guardian: ["theguardian.com", "theguardian.com/europe"],
			aljazeera: ["aljazeera.com"],
			worldbank: ["worldbank.org"],
			un: ["news.un.org"],
			stocks: [
				"finance.yahoo.com",
				"tradingview.com/news/",
				"coindesk.com/",
				"seekingalpha.com/market-news",
				"perplexity.ai/finance",
			],
		} as const;

		// Build domain constraints string
		const domainList = sources.flatMap(src => allowedDomains[src]).join(", ");

		const constraintText = `You are a news researcher tasked with gathering the latest information on the topic "${topic}".

Search for recent news articles ONLY from these domains: ${domainList}

You MUST respond with valid JSON that follows this exact structure:
{
  "summary_title": "News Summary: [TOPIC]",
  "sources": [${sources.map(s => `"${s}"`).join(", ")}],
  "top_headlines": "Comma-separated list of major headlines",
  "topic": ["${topic}"],
  "sentiment": ["Your analysis of overall sentiment: Positive/Neutral/Negative"],
  "tags": ["Relevant tags based on content analysis"],
  "target_audience": "Description of likely interested audience segments",
  "ai_summary": "Comprehensive 200-300 word summary of the key information, trends, and insights from the sources"
}

Research and analyze the latest news on "${topic}" from the specified sources. Fill in each field with appropriate content based on your research.`;

		const summary = await step.run("generate-news-summary", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					progress_message: "Researching the latest news from your selected sources...",
				},
			});

			const { text } = await generateText({
				model: vertex(modelId),
				tools: { google_search: vertex.tools.googleSearch({}) },
				providerOptions: {
					google: {
						// Thinking tokens (reasoning) for compatible Gemini models
						thinkingConfig: { includeThoughts: true },
					},
				},
				prompt: constraintText,
			});

			// Clean up the response - remove markdown code fences if present
			let cleanedText = text.trim();
			if (cleanedText.startsWith("```json")) {
				cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
			} else if (cleanedText.startsWith("```")) {
				cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
			} else if (cleanedText.includes("```json")) {
				// Extract JSON from within markdown blocks
				const jsonMatch = cleanedText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
				if (jsonMatch) {
					cleanedText = jsonMatch[1]!;
				}
			} else if (cleanedText.includes("```")) {
				// Fallback: try to extract JSON from any markdown block
				const jsonMatch = cleanedText.match(/```\s*(\{[\s\S]*?\})\s*```/);
				if (jsonMatch) {
					cleanedText = jsonMatch[1]!;
				}
			}

			return cleanedText;
		});

		await step.run("store-summary", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { summary: summary?.trim() || "" },
			});
		});

		// Get word/minute targets based on selected length
		const lengthConfig = getSummaryLengthConfig(summaryLength);
		const [minWords, maxWords] = lengthConfig.words;
		const [minMinutes, maxMinutes] = lengthConfig.minutes;

		if (generationMode === "single") {
			const script = await step.run("generate-single-script", async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: { progress_message: "Writing your news summary script..." },
				});

				// Parse the structured summary to extract the AI summary content
				let summaryContent = summary;
				try {
					const summaryData = JSON.parse(summary);
					summaryContent = summaryData.ai_summary || summary;
				} catch (error) {
					console.warn("Failed to parse structured summary, using raw text:", error);
				}

				const { text } = await generateText({
					model: vertex(modelId),
					prompt: `Task: Based on the NEWS SUMMARY below, write a ${minWords}-${maxWords} word (approximately ${minMinutes}-${maxMinutes} minutes) single-narrator podcast segment where a Podslice host presents the news highlights to listeners.

Identity & framing:
- The speaker is a Podslice host summarizing recent news.
- Present key stories, facts, and perspectives clearly.
- Maintain journalistic objectivity.

Brand opener (must be the first line, exactly):
"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."

Constraints:
- No stage directions, no timestamps, no sound effects.
- Spoken words only.
- Natural, engaging tone.
- Avoid sensationalism; stick to facts.

Structure:
- Hook that frames this as a Podslice news summary.
- Smooth transitions between news items.
- Clear, concise wrap-up.

NEWS SUMMARY:
${summaryContent}`,
				});

				return text;
			});

			const chunkUrls = await step.run("generate-and-upload-tts-chunks", async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: { progress_message: "Converting script to audio..." },
				});

				const chunkWordLimit = getTtsChunkWordLimit();
				const scriptParts = splitScriptIntoChunks(script, chunkWordLimit);
				const urls: string[] = [];
				const tempPath = `user-episodes/${userEpisodeId}/temp-chunks`;

				for (let i = 0; i < scriptParts.length; i++) {
					console.log(
						`[TTS] Generating and uploading chunk ${i + 1}/${scriptParts.length}`
					);

					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: {
							progress_message: `Generating audio (part ${i + 1} of ${scriptParts.length})...`,
						},
					});
					const buf = await generateSingleSpeakerTts(scriptParts[i]!);
					const chunkFileName = `${tempPath}/chunk-${i}.wav`;
					const gcsUrl = await uploadBufferToPrimaryBucket(buf, chunkFileName);
					urls.push(gcsUrl);
				}

				console.log(`[TTS] Uploaded ${urls.length} chunks to GCS`);
				return urls;
			});

			const { gcsAudioUrl, durationSeconds } = await step.run(
				"download-combine-upload-audio",
				async () => {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: { progress_message: "Finalizing your news episode..." },
					});

					const { getStorageReader, parseGcsUri } = await import(
						"@/lib/inngest/utils/gcs"
					);
					const storageReader = getStorageReader();

					console.log(`[COMBINE] Downloading ${chunkUrls.length} chunks from GCS`);
					const audioChunkBase64: string[] = [];

					for (const gcsUrl of chunkUrls) {
						const parsed = parseGcsUri(gcsUrl);
						if (!parsed) {
							throw new Error(`Invalid GCS URI: ${gcsUrl}`);
						}
						const [buffer] = await storageReader
							.bucket(parsed.bucket)
							.file(parsed.object)
							.download();
						audioChunkBase64.push(buffer.toString("base64"));
					}

					console.log(
						`[COMBINE] Downloaded ${audioChunkBase64.length} chunks, combining`
					);
					const fileName = `user-episodes/${userEpisodeId}-${Date.now()}.wav`;
					const { finalBuffer, durationSeconds } = combineAndUploadWavChunks(
						audioChunkBase64,
						fileName
					);
					const gcsUrl = await uploadBufferToPrimaryBucket(finalBuffer, fileName);

					// Clean up temporary chunk files
					try {
						const tempPath = `user-episodes/${userEpisodeId}/temp-chunks`;
						console.log(`[CLEANUP] Deleting temp chunks at ${tempPath}`);
						for (const chunkUrl of chunkUrls) {
							const parsed = parseGcsUri(chunkUrl);
							if (parsed) {
								await storageReader
									.bucket(parsed.bucket)
									.file(parsed.object)
									.delete()
									.catch(() => {});
							}
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
						duration_seconds: durationSeconds,
						status: "COMPLETED",
						progress_message: null,
					},
				});
			});
		} else {
			// Multi-speaker mode
			if (!(voiceA && voiceB)) {
				throw new Error("voiceA and voiceB are required for multi-speaker mode");
			}

			// Type assertion: voiceA and voiceB are guaranteed non-undefined after the check above
			const finalVoiceA: string = voiceA;
			const finalVoiceB: string = voiceB;

			const duetLines = await step.run("generate-duet-script", async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: { progress_message: "Creating an engaging two-host news discussion..." },
				});

				// Parse the structured summary to extract the AI summary content
				let summaryContent = summary;
				try {
					const summaryData = JSON.parse(summary);
					summaryContent = summaryData.ai_summary || summary;
				} catch (error) {
					console.warn("Failed to parse structured summary, using raw text:", error);
				}

				const { text } = await generateText({
					model: vertex(modelId),
					prompt: `Task: Based on the NEWS SUMMARY below, write a ${minWords}-${maxWords} word (approximately ${minMinutes}-${maxMinutes} minutes) two-host podcast conversation where Podslice hosts A and B discuss the news highlights. Alternate speakers naturally.

Identity & framing:
- Hosts are from Podslice presenting recent news.
- They discuss and provide context on key stories.
- Maintain journalistic objectivity while being conversational.

Brand opener (must be the first line, exactly, spoken by A):
"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."

Constraints:
- No stage directions, no timestamps, no sound effects.
- Spoken dialogue only.
- Natural, engaging tone.
- Avoid sensationalism; stick to facts.

Output ONLY valid JSON array of objects with fields: speaker ("A" or "B") and text (string). No markdown.

NEWS SUMMARY:
${summaryContent}`,
				});

				return coerceJsonArray(text);
			});

			const lineChunkUrls = await step.run(
				"generate-and-upload-dialogue-audio",
				async () => {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: {
							progress_message:
								"Converting dialogue to audio with your selected voices...",
						},
					});

					const urls: string[] = [];
					const tempPath = `user-episodes/${userEpisodeId}/temp-dialogue-chunks`;

					for (let i = 0; i < duetLines.length; i++) {
						const line = duetLines[i]!;
						console.log(
							`[TTS] Generating and uploading line ${i + 1}/${duetLines.length} (Speaker ${line.speaker!})`
						);

						await prisma.userEpisode.update({
							where: { episode_id: userEpisodeId },
							data: {
								progress_message: `Generating dialogue (line ${i + 1} of ${duetLines.length})...`,
							},
						});
						const voice = line.speaker === "A" ? finalVoiceA : finalVoiceB;
						const audio = await ttsWithVoice(line.text, voice);
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
							progress_message: "Stitching dialogue into your final news episode...",
						},
					});

					const { getStorageReader, parseGcsUri } = await import(
						"@/lib/inngest/utils/gcs"
					);
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
					const { finalBuffer, durationSeconds } = combineAndUploadWavChunks(
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
						progress_message: null,
					},
				});
			});
		}

		// Extract duration (fallback if initial extraction failed)
		await step.run("extract-duration", async () => {
			const result = await extractUserEpisodeDuration(userEpisodeId);
			if (!result.success) {
				console.warn(`[DURATION_EXTRACTION] Failed to extract duration: ${result.error}`);
			}
			return result;
		});

		// Notify user (in-app notification only)
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
						message: `Your news episode "${episode.episode_title}" is ready.`,
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
			message: "News episode generation workflow completed",
			userEpisodeId,
		};
	}
);
