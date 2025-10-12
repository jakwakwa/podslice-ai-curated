import { getEpisodeTargetMinutes } from "@/lib/env";
import { generateText as genText } from "@/lib/inngest/utils/genai";
import { generateObjectiveSummary } from "@/lib/inngest/utils/summary";

// TODO: Consider switching to Google Cloud Text-to-Speech API for stable TTS

import { extractUserEpisodeDuration } from "@/app/(protected)/admin/audio-duration/duration-extractor";
import emailService from "@/lib/email-service";
// aiConfig consumed indirectly via shared helpers
// Shared helpers
import { combineAndUploadWavChunks, generateSingleSpeakerTts, getTtsChunkWordLimit, splitScriptIntoChunks, uploadBufferToPrimaryBucket } from "@/lib/inngest/episode-shared";
// (No direct GCS import; handled in shared helpers)
import { prisma } from "@/lib/prisma";
import { inngest } from "./client";

// All uploads use the primary bucket defined by GOOGLE_CLOUD_STORAGE_BUCKET_NAME

// Removed local upload helper (now provided by shared helpers)

// Removed local Gemini client in favor of shared helper

// Deprecated local config (moved to shared helpers)

// Removed large in-file helpers in favor of shared module

export const generateUserEpisode = inngest.createFunction(
	{
		id: "generate-user-episode-workflow",
		name: "Generate User Episode Workflow",
		retries: 2,
		onFailure: async ({ error: _error, event }) => {
			const { userEpisodeId } = (event as unknown as { data: { event: { data: { userEpisodeId: string } } } }).data.event.data;
			if (!userEpisodeId) {
				console.error("[USER_EPISODE_FAILED] Missing userEpisodeId in failure event", event);
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
						select: { in_app_notifications: true, email: true, name: true },
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
					if (user?.email) {
						const userFirstName = (user.name || "").trim().split(" ")[0] || "there";
						await emailService.sendEpisodeFailedEmail(episode.user_id, user.email, {
							userFirstName,
							episodeTitle: episode.episode_title,
						});
					}
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
		const { userEpisodeId } = event.data as { userEpisodeId: string };

		await step.run("update-status-to-processing", async () => {
			return await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { status: "PROCESSING" },
			});
		});

		// Step 1: Get Transcript from Database
		const transcript = await step.run("get-transcript", async () => {
			const episode = await prisma.userEpisode.findUnique({
				where: { episode_id: userEpisodeId },
			});

			if (!episode) {
				throw new Error(`UserEpisode with ID ${userEpisodeId} not found.`);
			}

			if (!episode.transcript) {
				throw new Error(`No transcript found for episode ${userEpisodeId}`);
			}

			return episode.transcript;
		});

		// Step 2: Generate TRUE neutral summary (chunked if large)
		const summary = await step.run("generate-summary", async () => {
			const modelName = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
			const text = await generateObjectiveSummary(transcript, { modelName });
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { summary: text },
			});
			return text;
		});

		// Step 3: Generate Podslice-hosted script (commentary over summary)
		const script = await step.run("generate-script", async () => {
			const modelName2 = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
			const targetMinutes = getEpisodeTargetMinutes();
			const minWords = Math.floor(targetMinutes * 140);
			const maxWords = Math.floor(targetMinutes * 180);
			return genText(
				modelName2,
				`Task: Based on the SUMMARY below, write a ${minWords}-${maxWords} word (about ${targetMinutes} minutes) single-narrator podcast segment where a Podslice host explains the highlights to listeners.\n\nIdentity & framing:\n- The speaker is a Podslice host summarizing someone else's content.\n- Do NOT reenact or impersonate the original speakers.\n- Present key takeaways, context, and insights.\n\nBrand opener (must be the first line, exactly):\n"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."\n\nConstraints:\n- No stage directions, no timestamps, no sound effects.\n- Spoken words only.\n- Natural, engaging tone.\n- Avoid claiming ownership of original content; refer to it as “the video” or “the episode.”\n\nStructure:\n- Hook that frames this as a Podslice summary.\n- Smooth transitions between highlight clusters.\n- Clear, concise wrap-up.\n\nSUMMARY:\n${summary}`
			);
		});

		// Step 4: Convert to Audio - Upload chunks to GCS immediately to avoid memory/opcode limits
		const chunkUrls = await step.run("generate-and-upload-tts-chunks", async () => {
			const chunkWordLimit = getTtsChunkWordLimit();
			const scriptParts = splitScriptIntoChunks(script, chunkWordLimit);
			const urls: string[] = [];
			const tempPath = `user-episodes/${userEpisodeId}/temp-chunks`;

			for (let i = 0; i < scriptParts.length; i++) {
				console.log(`[TTS] Generating and uploading chunk ${i + 1}/${scriptParts.length}`);
				const buf = await generateSingleSpeakerTts(scriptParts[i]);
				// Upload immediately to GCS, return only the URL
				const chunkFileName = `${tempPath}/chunk-${i}.wav`;
				const gcsUrl = await uploadBufferToPrimaryBucket(buf, chunkFileName);
				urls.push(gcsUrl);
			}

			console.log(`[TTS] Uploaded ${urls.length} chunks to GCS`);
			return urls; // Only return URLs (small), not base64 data
		});

		const { gcsAudioUrl, durationSeconds } = await step.run("download-combine-upload-audio", async () => {
			// Download chunks from GCS, combine them, and upload final file
			const { getStorageReader, parseGcsUri } = await import("@/lib/gcs/utils/gcs");
			const storageReader = getStorageReader();

			console.log(`[COMBINE] Downloading ${chunkUrls.length} chunks from GCS`);
			const audioChunkBase64: string[] = [];

			for (const gcsUrl of chunkUrls) {
				const parsed = parseGcsUri(gcsUrl);
				if (!parsed) {
					throw new Error(`Invalid GCS URI: ${gcsUrl}`);
				}
				const [buffer] = await storageReader.bucket(parsed.bucket).file(parsed.object).download();
				audioChunkBase64.push(buffer.toString("base64"));
			}

			console.log(`[COMBINE] Downloaded ${audioChunkBase64.length} chunks, combining`);
			const fileName = `user-episodes/${userEpisodeId}-${Date.now()}.wav`;
			const { finalBuffer, durationSeconds } = combineAndUploadWavChunks(audioChunkBase64, fileName);
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
		});

		// Step 4: Finalize Episode
		await step.run("finalize-episode", async () => {
			return await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					gcs_audio_url: gcsAudioUrl,
					duration_seconds: durationSeconds,
					status: "COMPLETED",
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

		// Step 7: Notify user (in-app + email)
		await step.run("notify-user", async () => {
			const episode = await prisma.userEpisode.findUnique({
				where: { episode_id: userEpisodeId },
				select: { episode_id: true, episode_title: true, user_id: true },
			});

			if (!episode) return;

			const [user, profile] = await Promise.all([
				prisma.user.findUnique({
					where: { user_id: episode.user_id },
					select: { email: true, name: true, in_app_notifications: true },
				}),
				prisma.userCurationProfile.findFirst({
					where: { user_id: episode.user_id, is_active: true },
					select: { name: true },
				}),
			]);

			if (user?.in_app_notifications) {
				await prisma.notification.create({
					data: {
						user_id: episode.user_id,
						type: "episode_ready",
						message: `Your generated episode "${episode.episode_title}" is ready.`,
					},
				});
			}

			if (user?.email) {
				const userFirstName = (user.name || "").trim().split(" ")[0] || "there";
				const profileName = profile?.name ?? "Your personalized feed";
				const baseUrl = process.env.EMAIL_LINK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
				const episodeUrl = `${baseUrl}/my-episodes/${encodeURIComponent(userEpisodeId)}`;

				await emailService.sendEpisodeReadyEmail(episode.user_id, user.email, {
					userFirstName,
					episodeTitle: episode.episode_title,
					episodeUrl,
					profileName,
				});
			}
		});

		return {
			message: "Episode generation workflow completed",
			userEpisodeId,
		};
	}
);
