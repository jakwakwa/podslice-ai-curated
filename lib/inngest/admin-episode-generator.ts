import { getEpisodeTargetMinutes } from "@/lib/env";
import { combineAndUploadWavChunks, generateSingleSpeakerTts, getTtsChunkWordLimit, splitScriptIntoChunks, uploadBufferToPrimaryBucket } from "@/lib/inngest/episode-shared";
import { generateText as genText } from "@/lib/inngest/utils/genai";
import { generateObjectiveSummary } from "@/lib/inngest/utils/summary";
import { prisma } from "@/lib/prisma";
import { inngest } from "./client";

// (Notification/email logic intentionally omitted for now)

// Admin-triggered generation for curated catalog episodes (Episode + Podcast tables)
// This mirrors the user workflow but targets unified Episode storage. Audio saved under /podcasts

interface AdminEpisodeEventDataSimplified {
	youtubeUrl: string; // authoritative source
	podcastId: string;
	adminUserId: string;
}

interface LegacyAdminEpisodeEventData {
	sourceEpisodeId: string;
	podcastId: string;
	adminUserId: string;
}

export const generateAdminEpisode = inngest.createFunction(
	{ id: "generate-admin-episode-workflow", name: "Generate Admin Episode Workflow", retries: 2 },
	{ event: "admin.episode.generate.requested" },
	async ({ event, step }) => {
		// Backward compatibility: legacy events may include sourceEpisodeId; ignore them gracefully
		const dataUnknown = event.data as unknown;
		const isLegacy = (d: unknown): d is LegacyAdminEpisodeEventData => typeof d === "object" && d !== null && "sourceEpisodeId" in d && !("youtubeUrl" in (d as Record<string, unknown>));
		if (isLegacy(dataUnknown)) {
			console.warn("[ADMIN_EP_GEN] Received legacy event without youtubeUrl. Skipping.");
			return { message: "Skipped legacy admin generation event lacking youtubeUrl" };
		}
		const { youtubeUrl, podcastId } = event.data as AdminEpisodeEventDataSimplified;

		// 1. Fetch YouTube metadata (title, description, thumbnail)
		const videoDetails = await step.run("fetch-video-details", async () => {
			const { getYouTubeVideoDetails } = await import("@/lib/inngest/utils/youtube");
			return await getYouTubeVideoDetails(youtubeUrl);
		});

		// 2. Fetch transcript (best-effort) – if not available we still continue using the description
		const transcript = await step.run("fetch-transcript", async () => {
			try {
				const { getYouTubeTranscript } = await import("@/lib/client-youtube-transcript");
				const result = await getYouTubeTranscript(youtubeUrl);
				if (result.success && result.transcript) return result.transcript;
				return videoDetails?.description || ""; // fallback to description
			} catch (err) {
				console.warn("[ADMIN_EP_GEN] Transcript fallback to description", err);
				return videoDetails?.description || "";
			}
		});

		// 2. Neutral summary
		const summary = await step.run("generate-summary", async () => {
			const modelName = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
			return generateObjectiveSummary(transcript, { modelName });
		});

		// 3. Script (admin curated tone)
		const script = await step.run("generate-script", async () => {
			const modelName2 = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
			const targetMinutes = getEpisodeTargetMinutes();
			const minWords = Math.floor(targetMinutes * 140);
			const maxWords = Math.floor(targetMinutes * 180);
			return genText(
				modelName2,
				`Task: Based on the SOURCE SUMMARY below, write a ${minWords}-${maxWords} word (about ${targetMinutes} minutes) single-narrator podcast segment for the Podslice curated catalog.

Identity & framing:
- This is a Podslice editorial recap derived from public source material.
- Do NOT impersonate original speakers; provide curated insight.

Brand opener (must be the first line, exactly):
"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."

Constraints:
- Spoken words only (no stage directions, no timestamps).
- No claims of ownership of original material.
- Natural, engaging, neutral informative tone.

Structure:
- Hook
- Key thematic clusters with smooth transitions
- Concise wrap-up with forward-looking context

SOURCE SUMMARY:
${summary}`
			);
		});

		// 4. TTS in chunks - Upload to GCS immediately
		const chunkUrls = await step.run("generate-and-upload-tts-chunks", async () => {
			const chunkWordLimit = getTtsChunkWordLimit();
			const scriptParts = splitScriptIntoChunks(script, chunkWordLimit);
			const urls: string[] = [];
			const tempPath = `podcasts/${podcastId}/temp-chunks/${Date.now()}`;

			for (let i = 0; i < scriptParts.length; i++) {
				console.log(`[TTS] Generating and uploading admin chunk ${i + 1}/${scriptParts.length}`);
				const buf = await generateSingleSpeakerTts(scriptParts[i]);
				const chunkFileName = `${tempPath}/chunk-${i}.wav`;
				const gcsUrl = await uploadBufferToPrimaryBucket(buf, chunkFileName);
				urls.push(gcsUrl);
			}

			console.log(`[TTS] Uploaded ${urls.length} admin chunks to GCS`);
			return urls;
		});

		// 5. Download, combine, and upload final audio
		const { gcsAudioUrl, durationSeconds } = await step.run("download-combine-upload", async () => {
			const { getStorageReader, parseGcsUri } = await import("@/lib/gcs/utils/gcs");
			const storageReader = getStorageReader();

			console.log(`[COMBINE] Downloading ${chunkUrls.length} admin chunks from GCS`);
			const audioChunkBase64: string[] = [];

			for (const gcsUrl of chunkUrls) {
				const parsed = parseGcsUri(gcsUrl);
				if (!parsed) throw new Error(`Invalid GCS URI: ${gcsUrl}`);
				const [buffer] = await storageReader.bucket(parsed.bucket).file(parsed.object).download();
				audioChunkBase64.push(buffer.toString("base64"));
			}

			console.log(`[COMBINE] Downloaded ${audioChunkBase64.length} chunks, combining`);
			const fileName = `podcasts/${podcastId}/admin-${Date.now()}.wav`;
			const { finalBuffer, durationSeconds } = combineAndUploadWavChunks(audioChunkBase64, fileName);
			const gcsUrl = await uploadBufferToPrimaryBucket(finalBuffer, fileName);

			// Clean up temporary chunks
			try {
				for (const chunkUrl of chunkUrls) {
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
		});

		// 6. Persist new curated Episode record
		const createdEpisode = await step.run("create-episode", async () => {
			return prisma.episode.create({
				data: {
					podcast_id: podcastId,
					title: videoDetails?.title || `Curated Recap ${new Date().toISOString().slice(0, 10)}`,
					description: summary,
					audio_url: gcsAudioUrl,
					image_url: videoDetails?.thumbnailUrl || undefined,
					duration_seconds: durationSeconds,
					published_at: new Date(),
				},
			});
		});

		// (Optional) Step 7: Admin notification (in-app). Skipped to keep scope minimal.
		// Extend here if needed using Notification model.

		return { message: "Admin curated episode generated", episodeId: createdEpisode.episode_id, podcastId };
	}
);
