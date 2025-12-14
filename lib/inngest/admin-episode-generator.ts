import { z } from "zod";
import { getEpisodeTargetMinutes } from "@/lib/env";
import {
	combineAndUploadWavChunks,
	getTtsChunkWordLimit,
	sanitizeSpeakerLabels,
	uploadBufferToPrimaryBucket,
} from "@/lib/inngest/episode-shared";
import { generateTtsAudio, generateText as genText } from "@/lib/inngest/utils/genai";
import { generateObjectiveSummary } from "@/lib/inngest/utils/summary";
import { prisma } from "@/lib/prisma";
import { inngest } from "./client";

// (Notification/email logic intentionally omitted for now)

// Admin-triggered generation for curated catalog episodes (Episode + Podcast tables)
// This mirrors the user workflow but targets unified Episode storage. Audio saved under /podcasts
// Uses multi-speaker (duet) format by default

// Default voices for admin episodes (matching user episode defaults)
const DEFAULT_VOICE_A = "Rasalgethi";
const DEFAULT_VOICE_B = "Sulafat";

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

interface AdminEpisodeEventDataSimplified {
	youtubeUrl: string; // authoritative source
	podcastId: string;
	adminUserId: string;
	transcript?: string;
	title?: string;
	imageUrl?: string;
}

interface LegacyAdminEpisodeEventData {
	sourceEpisodeId: string;
	podcastId: string;
	adminUserId: string;
}

export const generateAdminEpisode = inngest.createFunction(
	{
		id: "generate-admin-episode-workflow",
		name: "Generate Admin Episode Workflow",
		retries: 2,
	},
	{ event: "admin.episode.generate.requested" },
	async ({ event, step }) => {
		// Backward compatibility: legacy events may include sourceEpisodeId; ignore them gracefully
		const dataUnknown = event.data as unknown;
		const isLegacy = (d: unknown): d is LegacyAdminEpisodeEventData =>
			typeof d === "object" &&
			d !== null &&
			"sourceEpisodeId" in d &&
			!("youtubeUrl" in (d as Record<string, unknown>));
		if (isLegacy(dataUnknown)) {
			console.warn("[ADMIN_EP_GEN] Received legacy event without youtubeUrl. Skipping.");
			return { message: "Skipped legacy admin generation event lacking youtubeUrl" };
		}
		const {
			youtubeUrl,
			podcastId,
			transcript: providedTranscript,
			title: providedTitle,
			imageUrl: providedImage,
		} = event.data as AdminEpisodeEventDataSimplified;

		// 1. Fetch YouTube metadata (title, description, thumbnail)
		const videoDetails = await step.run("fetch-video-details", async () => {
			if (providedTitle && providedImage) {
				return {
					title: providedTitle,
					description: "", // Description not strictly needed if we have transcript, or we can add it to event data if needed
					thumbnailUrl: providedImage,
					channelTitle: "",
					publishedAt: new Date().toISOString(),
					duration: 0,
				};
			}
			const { getYouTubeVideoDetails } = await import("@/lib/inngest/utils/youtube");
			return await getYouTubeVideoDetails(youtubeUrl);
		});

		// 2. Fetch transcript (best-effort) – if not available we still continue using the description
		const transcript = await step.run("fetch-transcript", async () => {
			if (providedTranscript) return providedTranscript;
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

		// 3. Generate duet dialogue script (admin curated tone)
		const duetLines = await step.run("generate-duet-script", async () => {
			const modelName2 = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
			const targetMinutes = getEpisodeTargetMinutes();
			const minWords = Math.floor(targetMinutes * 140);
			const maxWords = Math.floor(targetMinutes * 180);
			const text = await genText(
				modelName2,
				`Task: Based on the SOURCE SUMMARY below, write a ${minWords}-${maxWords} word (approximately ${targetMinutes} minutes) two-host podcast conversation where Podslice hosts A and B explain the highlights to listeners. Alternate speakers naturally.

Identity & framing:
- Hosts are from Podslice and are commenting on someone else's content.
- They do NOT reenact or impersonate the original speakers.
- They present key takeaways, context, and insights.
- This is a Podslice editorial recap derived from public source material.

Brand opener (must be the first line, exactly, spoken by A):
"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."

Constraints:
- No stage directions, no timestamps, no sound effects.
- Spoken dialogue only.
- Natural, engaging tone.
- Avoid claiming ownership of original content; refer to it as "the video" or "the episode."
- Do not include any speaker names, labels, or direct addresses in the text (e.g., no 'A', 'B', 'Hey Host', 'What do you think?'). The hosts should discuss the content without referencing each other by name or label.

Output ONLY valid JSON array of objects with fields: speaker ("A" or "B") and text (string). The text MUST NOT include any speaker names or labels; only the spoken words. No markdown.

SOURCE SUMMARY:
${summary}`
			);
			return coerceJsonArray(text);
		});

		// 4. TTS for all dialogue lines - Upload chunks to GCS immediately
		const lineChunkUrls = await step.run("generate-and-upload-dialogue-audio", async () => {
			const urls: string[] = [];
			const tempPath = `podcasts/${podcastId}/temp-dialogue-chunks/${Date.now()}`;

			for (let i = 0; i < duetLines.length; i++) {
				const line = duetLines[i];
				console.log(
					`[TTS] Generating and uploading admin dialogue line ${i + 1}/${duetLines.length} (Speaker ${line?.speaker})`
				);

				if (!line) {
					console.warn(`[TTS] Skipping undefined line at index ${i}`);
					continue;
				}
				const voice = line.speaker === "A" ? DEFAULT_VOICE_A : DEFAULT_VOICE_B;
				const sanitizedText = sanitizeSpeakerLabels(line.text);
				const audio = await ttsWithVoice(sanitizedText, voice);
				const chunkFileName = `${tempPath}/line-${i}.wav`;
				const gcsUrl = await uploadBufferToPrimaryBucket(audio, chunkFileName);
				urls.push(gcsUrl);
			}

			console.log(`[TTS] Uploaded ${urls.length} admin dialogue chunks to GCS`);
			return urls;
		});

		// 5. Download, combine, and upload final audio
		const { gcsAudioUrl, durationSeconds } = await step.run(
			"download-combine-upload-multi-voice",
			async () => {
				const { getStorageReader, parseGcsUri } = await import("@/lib/inngest/utils/gcs");
				const storageReader = getStorageReader();

				console.log(`[COMBINE] Downloading ${lineChunkUrls.length} admin dialogue chunks from GCS`);
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
				const fileName = `podcasts/${podcastId}/admin-duet-${Date.now()}.wav`;
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

		// 6. Persist new curated Episode record
		const createdEpisode = await step.run("create-episode", async () => {
			return prisma.episode.create({
				data: {
					podcast_id: podcastId,
					title:
						videoDetails?.title ||
						`Curated Recap ${new Date().toISOString().slice(0, 10)}`,
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

		return {
			message: "Admin curated episode generated",
			episodeId: createdEpisode.episode_id,
			podcastId,
		};
	}
);
