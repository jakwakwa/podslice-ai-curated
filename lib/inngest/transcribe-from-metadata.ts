import { z } from "zod";
import { writeEpisodeDebugLog } from "@/lib/debug-logger";
import emailService from "@/lib/email-service";
import { prisma } from "@/lib/prisma";
import { getYouTubeVideoDetails } from "@/lib/youtube";
// URL-only mandate: removed external audio discovery
import { inngest } from "./client";

type MetadataPayload = {
	userEpisodeId: string;
	title: string;
	podcastName?: string;
	youtubeUrl: string;
	generationMode?: "single" | "multi";
	voiceA?: string;
	voiceB?: string;
};

// AssemblyAI helpers removed — AssemblyAI is no longer used as a fallback.

// --- Audio resolution helpers -------------------------------------------------
function isYouTubeUrl(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		const host = hostname.toLowerCase();
		return host === "youtu.be" || host.endsWith(".youtu.be") || host === "youtube.com" || host.endsWith(".youtube.com");
	} catch {
		return false;
	}
}

// Note: No direct-audio URL detection is needed per URL-only mandate

// NOTE: duplicate YouTube extraction removed; use shared util if needed elsewhere

export const enqueueTranscriptionJob = inngest.createFunction(
	{ id: "enqueue-transcription-job", name: "Enqueue Transcription Job", retries: 2 },
	{ event: "user.episode.metadata.requested" },
	async ({ event, step }) => {
		const payload = event.data as MetadataPayload;
		const { userEpisodeId, title, podcastName, youtubeUrl, generationMode, voiceA, voiceB } = payload;

		const inputSchema = z.object({
			userEpisodeId: z.string().min(1),
			title: z.string().min(2),
			podcastName: z.string().optional(),
			youtubeUrl: z.string().url(),
		});
		const parsed = inputSchema.safeParse({ userEpisodeId, title, podcastName, youtubeUrl });
		if (!parsed.success) throw new Error(parsed.error.message);

		// 1) Mark processing
		await step.run("mark-processing", async () => {
			await prisma.userEpisode.update({ where: { episode_id: userEpisodeId }, data: { status: "PROCESSING" } });
			await writeEpisodeDebugLog(userEpisodeId, { step: "status", status: "start", message: "PROCESSING" });
		});

		// 2) URL-only: require YouTube URL
		if (!(youtubeUrl && isYouTubeUrl(youtubeUrl))) {
			await step.run("mark-failed-no-url", async () => {
				await prisma.userEpisode.update({ where: { episode_id: userEpisodeId }, data: { status: "FAILED" } });
				await writeEpisodeDebugLog(userEpisodeId, { step: "resolve-src", status: "fail", message: "Missing or invalid YouTube URL" });
			});
			await step.run("email-invalid-url", async () => {
				try {
					const episode = await prisma.userEpisode.findUnique({
						where: { episode_id: userEpisodeId },
						select: { episode_title: true, user_id: true },
					});
					if (episode) {
						const user = await prisma.user.findUnique({
							where: { user_id: episode.user_id },
							select: { email: true, name: true },
						});
						if (user?.email) {
							const userFirstName = (user.name || "").trim().split(" ")[0] || "there";
							await emailService.sendEpisodeFailedEmail(episode.user_id, user.email, {
								userFirstName,
								episodeTitle: episode.episode_title,
							});
						}
					}
				} catch (err) {
					console.error("[INVALID_URL_EMAIL]", err);
				}
			});
			return { message: "Missing or invalid YouTube URL", userEpisodeId };
		}

		const srcUrl: string = youtubeUrl;

		// 2b) Primary YouTube metadata enrichment (title + duration) BEFORE saga dispatch
		await step.run("enrich-youtube-metadata", async () => {
			try {
				const details = await getYouTubeVideoDetails(srcUrl);
				if (!details) return; // silent fallback

				// Only overwrite title if it's obviously a placeholder (short or generic)
				const existing = await prisma.userEpisode.findUnique({ where: { episode_id: userEpisodeId }, select: { episode_title: true } });
				const currentTitle = existing?.episode_title?.trim() || "";
				const shouldReplace = currentTitle.length < 4 || /^(untitled|video)$/i.test(currentTitle);

				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						episode_title: shouldReplace ? details.title : currentTitle || details.title,
						duration_seconds: details.duration > 0 ? details.duration : undefined,
					},
				});
				await writeEpisodeDebugLog(userEpisodeId, { step: "youtube-metadata", status: "success", meta: { fetched: true, replacedTitle: shouldReplace } });
			} catch (_err) {
				// Non-fatal – log and continue (avoid leaking full error details)
				console.warn("[YOUTUBE_METADATA_ENRICH_FAIL]");
				await writeEpisodeDebugLog(userEpisodeId, { step: "youtube-metadata", status: "fail", message: "metadata fetch error" });
			}
		});

		// Store the resolved url (direct audio or YouTube) for traceability
		await step.run("store-src-url", async () => {
			await prisma.userEpisode.update({ where: { episode_id: userEpisodeId }, data: { youtube_url: srcUrl } });
			await writeEpisodeDebugLog(userEpisodeId, { step: "resolve-src", status: "success", meta: { srcUrl } });
		});

		// 3) Dispatch event-driven saga and let it orchestrate providers and fallbacks
		const jobId = `ue-${userEpisodeId}-${Date.now()}`;
		await writeEpisodeDebugLog(userEpisodeId, { step: "saga", status: "info", message: "sending transcription.job.requested", meta: { jobId } });
		await step.sendEvent("start-saga", {
			name: "transcription.job.requested",
			data: { jobId, userEpisodeId, srcUrl, generationMode, voiceA, voiceB },
		});
		await writeEpisodeDebugLog(userEpisodeId, { step: "saga", status: "success", message: "sent transcription.job.requested", meta: { jobId } });

		await writeEpisodeDebugLog(userEpisodeId, { step: "saga", status: "info", meta: { jobId, state: "queued" } });
		return { message: "Transcription saga dispatched", userEpisodeId, jobId };
	}
);

export type { MetadataPayload };
