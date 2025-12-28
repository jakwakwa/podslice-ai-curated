import { extractUserEpisodeDuration } from "@/app/(protected)/admin/audio-duration/duration-extractor";
// aiConfig consumed indirectly via shared helpers
// Shared helpers
import {
	combineAndUploadWavChunks,
	generateSingleSpeakerTts,
	getTtsChunkWordLimit,
	splitScriptIntoChunks,
	uploadBufferToPrimaryBucket,
} from "@/lib/inngest/episode-shared";
import { generateElevenLabsTts } from "@/lib/inngest/utils/elevenlabs";
import { generateText as genText } from "@/lib/inngest/utils/genai";
import {
	generateObjectiveSummaryWithOpenAI,
	generateTextWithOpenAI,
} from "@/lib/inngest/utils/openai";
import {
	generateFinancialAnalysis,
	generateObjectiveSummary,
} from "@/lib/inngest/utils/summary";
// (No direct GCS import; handled in shared helpers)
import { prisma } from "@/lib/prisma";
import {
	getSummaryLengthConfig,
	SUMMARY_LENGTH_OPTIONS,
	type SummaryLengthOption,
} from "@/lib/types/summary-length";
import { inngest } from "./client";

// All uploads use the primary bucket defined by GOOGLE_CLOUD_STORAGE_BUCKET_NAME

// Removed local upload helper (now provided by shared helpers)

// Removed local Gemini client in favor of shared helper

// Deprecated local config (moved to shared helpers)

// Removed large in-file helpers in favor of shared module

const isSummaryLengthOption = (value: unknown): value is SummaryLengthOption =>
	typeof value === "string" && value in SUMMARY_LENGTH_OPTIONS;

type GenerateEpisodeEventPayload = {
	userEpisodeId: string;
	summaryLength?: SummaryLengthOption;
};

export const generateUserEpisode = inngest.createFunction(
	{
		id: "generate-user-episode-workflow",
		name: "Generate User Episode Workflow",
		retries: 0, // Disable all retries to allow immediate fallback logic (Gemini → ElevenLabs)
		onFailure: async ({ error: _error, event, step }) => {
			const { userEpisodeId } = (
				event as unknown as { data: { event: { data: { userEpisodeId: string } } } }
			).data.event.data;
			if (!userEpisodeId) {
				console.error(
					"[USER_EPISODE_FAILED] Missing userEpisodeId in failure event",
					event
				);
				return;
			}
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { status: "FAILED" },
			});

			// Best-effort in-app notification on failure
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
	{
		event: "user.episode.generate.requested",
	},
	async ({ event, step }) => {
		const { userEpisodeId, summaryLength: incomingSummaryLength } =
			event.data as GenerateEpisodeEventPayload;

		let resolvedSummaryLength: SummaryLengthOption = isSummaryLengthOption(
			incomingSummaryLength
		)
			? incomingSummaryLength
			: "MEDIUM";

		await step.run("update-status-to-processing", async () => {
			return await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					status: "PROCESSING",
					progress_message: "Getting started—preparing your episode for processing...",
				},
			});
		});

		// Step 1: Get Transcript from Database
		const transcriptContext = await step.run("get-transcript", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { progress_message: "Loading your video transcript..." },
			});

			const episode = await prisma.userEpisode.findUnique({
				where: { episode_id: userEpisodeId },
				select: {
					transcript: true,
					summary_length: true,
				},
			});

			if (!episode) {
				throw new Error(`UserEpisode with ID ${userEpisodeId} not found.`);
			}

			if (!episode.transcript) {
				throw new Error(`No transcript found for episode ${userEpisodeId}`);
			}

			return {
				transcript: episode.transcript,
				summaryLength: episode.summary_length,
			};
		});

		if (isSummaryLengthOption(transcriptContext.summaryLength)) {
			resolvedSummaryLength = transcriptContext.summaryLength;
		}

		const transcript = transcriptContext.transcript;

		// Step 2: Generate TRUE neutral summary (chunked if large)
		const summary = await step.run("generate-summary", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { progress_message: "Analyzing content and extracting key insights..." },
			});

			const modelName = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
			let text: string;
			try {
				text = await generateObjectiveSummary(transcript, { modelName });
			} catch (error) {
				console.warn(
					"[FALLBACK] Gemini summary generation failed, attempting OpenAI fallback...",
					error
				);
				try {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: {
							progress_message:
								"Using backup service to analyze content and extract key insights...",
						},
					});
					text = await generateObjectiveSummaryWithOpenAI(transcript);
				} catch (backupError) {
					console.error("[FALLBACK] OpenAI summary generation also failed", backupError);
					throw backupError; // Fail the entire workflow since both providers failed
				}
			}
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { summary: text },
			});
			return text;
		});

		// Step 2.5: Generate Financial Analysis (B2B Logic)
		await step.run("generate-financial-intelligence", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { progress_message: "Extracting financial intelligence..." },
			});

			try {
				const analysis = await generateFinancialAnalysis(transcript);
				// Save intelligence data
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						sentiment: analysis.sentiment,
						sentiment_score: analysis.sentimentScore,
						// Use any cast if specific JSON typing is strict, but Prisma Json handles objects/arrays
						mentioned_assets: analysis.mentionedAssets as any,
						// technical_contradictions not in schema yet
					},
				});
				return analysis;
			} catch (error) {
				console.error("[FINANCIAL_ANALYSIS] Failed to extract intelligence", error);
				// Non-blocking failure; just continue
				return null;
			}
		});

		// Step 3: Generate Podslice-hosted script (commentary over summary)
		const script = await step.run("generate-script", async () => {
			const modelName2 = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";

			// Get word/minute targets based on selected length
			const lengthConfig = getSummaryLengthConfig(resolvedSummaryLength);
			const [minWords, maxWords] = lengthConfig.words;
			const [minMinutes, maxMinutes] = lengthConfig.minutes;

			const scriptPrompt = `Task: Based on the SUMMARY below, write a ${minWords}-${maxWords} word (approximately ${minMinutes}-${maxMinutes} minutes) single-narrator podcast segment where a Podslice host explains the highlights to listeners.\n\nIdentity & framing:\n- The speaker is a Podslice host summarizing someone else's content.\n- Do NOT reenact or impersonate the original speakers.\n- Present key takeaways, context, and insights.\n\nBrand opener (must be the first line, exactly):\n"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."\n\nConstraints:\n- No stage directions, no timestamps, no sound effects.\n- Spoken words only.\n- Natural, engaging tone.\n- Avoid claiming ownership of original content; refer to it as "the video" or "the episode."\n\nStructure:\n- Hook that frames this as a Podslice summary.\n- Smooth transitions between highlight clusters.\n- Clear, concise wrap-up.\n\nSUMMARY:\n${summary}`;

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

			// Validate and enforce word count limit to ensure episodes stay within target duration
			const words = rawScript.split(/\s+/).filter(Boolean);
			const wordCount = words.length;

			if (wordCount > maxWords) {
				console.log(
					`⚠️ Script exceeds target word count: ${wordCount} words (max: ${maxWords} for ${resolvedSummaryLength}). Truncating to ${maxWords} words.`
				);
				// Truncate to maxWords, preserving sentence boundaries where possible
				const truncatedWords = words.slice(0, maxWords);
				// Try to end on a sentence boundary
				let truncatedScript = truncatedWords.join(" ");
				const lastPeriod = truncatedScript.lastIndexOf(".");
				const lastQuestion = truncatedScript.lastIndexOf("?");
				const lastExclamation = truncatedScript.lastIndexOf("!");
				const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

				if (lastSentenceEnd >= 0) {
					// Always end on a sentence boundary if possible to ensure natural flow
					truncatedScript = truncatedScript.substring(0, lastSentenceEnd + 1);
				}

				return truncatedScript;
			}

			return rawScript;
		});

		// Step 4: Convert to Audio - Upload chunks to GCS immediately to avoid memory/opcode limits
		const chunkUrls = await step.run("generate-and-upload-tts-chunks", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					progress_message: "Converting script to audio with your selected voice...",
				},
			});

			const chunkWordLimit = getTtsChunkWordLimit();
			const scriptParts = splitScriptIntoChunks(script, chunkWordLimit);
			const urls: string[] = [];
			const tempPath = `user-episodes/${userEpisodeId}/temp-chunks`;

			for (let i = 0; i < scriptParts.length; i++) {
				console.log(
					`[TTS] Generating and uploading chunk ${i + 1}/${scriptParts.length}`
				);

				// Update progress with current chunk
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						progress_message: `Generating audio (part ${i + 1} of ${scriptParts.length})...`,
					},
				});

				let buf: Buffer;
				try {
					buf = await generateSingleSpeakerTts(scriptParts[i]!);
				} catch (error) {
					console.warn(
						`[TTS] Gemini TTS failed for chunk ${i + 1}/${scriptParts.length}. Attempting backup with ElevenLabs...`,
						error
					);
					try {
						buf = await generateElevenLabsTts(scriptParts[i]!);
					} catch (backupError) {
						console.error(
							`[TTS] Backup ElevenLabs TTS also failed for chunk ${i + 1}/${scriptParts.length}`,
							backupError
						);
						throw backupError; // Fail the entire workflow since both providers failed
					}
				}
				// Upload immediately to GCS, return only the URL
				const chunkFileName = `${tempPath}/chunk-${i}.wav`;
				const gcsUrl = await uploadBufferToPrimaryBucket(buf, chunkFileName);
				urls.push(gcsUrl);
			}

			console.log(`[TTS] Uploaded ${urls.length} chunks to GCS`);
			return urls; // Only return URLs (small), not base64 data
		});

		const { gcsAudioUrl, durationSeconds } = await step.run(
			"download-combine-upload-audio",
			async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						progress_message:
							"Stitching audio segments together into your final episode...",
					},
				});

				// Download chunks from GCS, combine them, and upload final file
				const { getStorageReader, parseGcsUri } = await import("@/lib/inngest/utils/gcs");
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

				console.log(`[COMBINE] Downloaded ${audioChunkBase64.length} chunks, combining`);
				const fileName = `user-episodes/${userEpisodeId}-${Date.now()}.wav`;
				const { finalBuffer, durationSeconds } = await combineAndUploadWavChunks(
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

		// Step 4: Finalize Episode
		await step.run("finalize-episode", async () => {
			return await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					gcs_audio_url: gcsAudioUrl,
					duration_seconds: durationSeconds,
					status: "COMPLETED",
					progress_message: null, // Clear progress message on completion
				},
			});
		});

		// Step 5: Extract duration (fallback if initial extraction failed)
		await step.run("extract-duration", async () => {
			const result = await extractUserEpisodeDuration(userEpisodeId);
			if (!result.success) {
				console.warn(`[DURATION_EXTRACTION] Failed to extract duration: ${result.error}`);
			}
			return result;
		});

		// Step 6: Episode Usage is now tracked by counting UserEpisode records
		// No need to update subscription table - usage is calculated dynamically

		// Step 7: Notify user (in-app notification only)
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
						message: `Your generated episode "${episode.episode_title}" is ready.`,
					},
				});
			}
		});

		// Step 8: Trigger email notification (runs in Next.js runtime)
		await step.sendEvent("send-ready-email", {
			name: "episode.ready.email",
			data: { userEpisodeId },
		});

		return {
			message: "Episode generation workflow completed",
			userEpisodeId,
			summaryLength: resolvedSummaryLength,
		};
	}
);
