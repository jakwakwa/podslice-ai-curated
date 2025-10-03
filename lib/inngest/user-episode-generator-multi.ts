import { z } from "zod";
import { extractUserEpisodeDuration } from "@/app/(protected)/admin/audio-duration/duration-extractor";
import { aiConfig } from "@/config/ai";
import emailService from "@/lib/email-service";
import { combineAndUploadWavChunks, uploadBufferToPrimaryBucket } from "@/lib/inngest/episode-shared";
import { generateTtsAudio, generateText as genText } from "@/lib/inngest/utils/genai";
import { generateObjectiveSummary } from "@/lib/inngest/utils/summary";
import { prisma } from "@/lib/prisma";
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
	const attempts: Array<() => unknown> = [() => JSON.parse(input), () => JSON.parse(input.match(/\[[\s\S]*\]/)?.[0] || "[]"), () => JSON.parse(stripMarkdownJsonFences(input))];
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
		onFailure: async ({ event }) => {
			const { userEpisodeId } = (event as unknown as { data: { event: { data: { userEpisodeId: string } } } }).data.event.data;
			if (!userEpisodeId) {
				console.error("[USER_EPISODE_MULTI_FAILED] Missing userEpisodeId in failure event", event);
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
	{ event: "user.episode.generate.multi.requested" },
	async ({ event, step }) => {
		const { userEpisodeId, voiceA, voiceB, useShortEpisodesOverride } = event.data as {
			userEpisodeId: string;
			voiceA: string;
			voiceB: string;
			useShortEpisodesOverride?: boolean;
		};

		await step.run("update-status-to-processing", async () => {
			return await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { status: "PROCESSING" },
			});
		});

		const transcript = await step.run("get-transcript", async () => {
			const episode = await prisma.userEpisode.findUnique({
				where: { episode_id: userEpisodeId },
			});
			if (!episode) throw new Error(`UserEpisode with ID ${userEpisodeId} not found.`);
			if (!episode.transcript) throw new Error(`No transcript found for episode ${userEpisodeId}`);
			return episode.transcript;
		});

		const isShort = useShortEpisodesOverride ?? aiConfig.useShortEpisodes;

		const summary = await step.run("generate-summary", async () => {
			const modelName = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
			const text = await generateObjectiveSummary(transcript, { modelName });
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { summary: text },
			});
			return text;
		});

		const duetLines = await step.run("generate-duet-script", async () => {
			const modelName2 = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
			const text = await genText(
				modelName2,
				`Task: Based on the SUMMARY below, write a two-host podcast conversation where Podslice hosts A and B explain the highlights to listeners. Alternate speakers naturally. Keep it ${isShort ? "short (~1 minute)" : "around 3-5 minutes)"}.\n\nIdentity & framing:\n- Hosts are from Podslice and are commenting on someone else's content.\n- They do NOT reenact or impersonate the original speakers.\n- They present key takeaways, context, and insights.\n\nBrand opener (must be the first line, exactly, spoken by A):\n"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."\n\nConstraints:\n- No stage directions, no timestamps, no sound effects.\n- Spoken dialogue only.\n- Natural, engaging tone.\n- Avoid claiming ownership of original content; refer to it as “the video” or “the episode.”\n\nOutput ONLY valid JSON array of objects with fields: speaker ("A" or "B") and text (string). No markdown.\n\nSUMMARY:\n${summary}`
			);
			return coerceJsonArray(text);
		});

		// TTS for all dialogue lines - Upload chunks to GCS immediately
		const lineChunkUrls = await step.run("generate-and-upload-dialogue-audio", async () => {
			const urls: string[] = [];
			const tempPath = `user-episodes/${userEpisodeId}/temp-dialogue-chunks`;

			for (let i = 0; i < duetLines.length; i++) {
				const line = duetLines[i];
				console.log(`[TTS] Generating and uploading line ${i + 1}/${duetLines.length} (Speaker ${line.speaker})`);
				const voice = line.speaker === "A" ? voiceA : voiceB;
				const audio = await ttsWithVoice(line.text, voice);
				// Upload immediately to GCS
				const chunkFileName = `${tempPath}/line-${i}.wav`;
				const gcsUrl = await uploadBufferToPrimaryBucket(audio, chunkFileName);
				urls.push(gcsUrl);
			}

			console.log(`[TTS] Uploaded ${urls.length} dialogue chunks to GCS`);
			return urls;
		});

		const { gcsAudioUrl, durationSeconds } = await step.run("download-combine-upload-multi-voice", async () => {
			// Download chunks from GCS, combine them, and upload final file
			const { getStorageReader, parseGcsUri } = await import("@/lib/inngest/utils/gcs");
			const storageReader = getStorageReader();

			console.log(`[COMBINE] Downloading ${lineChunkUrls.length} dialogue chunks from GCS`);
			const lineAudioBase64: string[] = [];

			for (const gcsUrl of lineChunkUrls) {
				const parsed = parseGcsUri(gcsUrl);
				if (!parsed) throw new Error(`Invalid GCS URI: ${gcsUrl}`);
				const [buffer] = await storageReader.bucket(parsed.bucket).file(parsed.object).download();
				lineAudioBase64.push(buffer.toString("base64"));
			}

			console.log(`[COMBINE] Downloaded ${lineAudioBase64.length} chunks, combining`);
			const fileName = `user-episodes/${userEpisodeId}-duet-${Date.now()}.wav`;
			const { finalBuffer, durationSeconds } = combineAndUploadWavChunks(lineAudioBase64, fileName);
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
		});

		await step.run("finalize-episode", async () => {
			return await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { gcs_audio_url: gcsAudioUrl, status: "COMPLETED", duration_seconds: durationSeconds },
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
						message: `Your multi-speaker episode "${episode.episode_title}" is ready to listen.`,
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
			message: "Multi-speaker episode generation completed",
			userEpisodeId,
			voiceA,
			voiceB,
		};
	}
);
