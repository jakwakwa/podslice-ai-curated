import { getProviderWindowSeconds } from "@/lib/env";
import emailService from "@/lib/email-service";
import { inngest } from "@/lib/inngest/client";
import { getYouTubeVideoDetails } from "@/lib/inngest/utils/youtube";
import { prisma } from "@/lib/prisma";
import { preflightProbe } from "./utils/preflight";
import { ProviderSucceededSchema, TranscriptionRequestedSchema } from "./utils/results";

const Events = {
	JobRequested: "transcription.job.requested",
	ProviderStart: {
		Gemini: "transcription.provider.gemini.start",
	},
	Succeeded: "transcription.succeeded",
	Failed: "transcription.failed",
	Finalized: "transcription.finalized",
} as const;

export const transcriptionCoordinator = inngest.createFunction(
	{ id: "transcription-coordinator", name: "Transcription Coordinator", retries: 0 },
	{ event: Events.JobRequested },
	async ({ event, step }) => {
		const input = TranscriptionRequestedSchema.parse(event.data);
		const { jobId, userEpisodeId, srcUrl, generationMode, voiceA, voiceB } = input;

		await step.run("mark-processing", async () => {
			await prisma.userEpisode.update({ where: { episode_id: userEpisodeId }, data: { status: "PROCESSING", youtube_url: srcUrl } });
		});

		const probe = await step.run("preflight-probe", async () => await preflightProbe(srcUrl));

		// Attempt metadata enrichment if missing
		await step.run("ensure-video-metadata", async () => {
			try {
				if (!/youtu\.be|youtube\.com/i.test(srcUrl)) return;
				const episode = await prisma.userEpisode.findUnique({
					where: { episode_id: userEpisodeId },
					select: { episode_title: true, duration_seconds: true },
				});
				const needsDuration = !episode?.duration_seconds;
				const title = episode?.episode_title?.trim() || "";
				const needsTitle = title.length < 4 || /^(untitled|video)$/i.test(title);
				if (!(needsDuration || needsTitle)) return;
				const details = await getYouTubeVideoDetails(srcUrl);
				if (!details) return;

				// Validate video duration against MAX_DURATION_SECONDS
				const { getMaxDurationSeconds } = await import("@/lib/env");
				const maxDurationSeconds = getMaxDurationSeconds();
				if (details.duration > maxDurationSeconds) {
					throw new Error(`Video duration ${details.duration} seconds exceeds maximum allowed duration of ${maxDurationSeconds} seconds (${Math.floor(maxDurationSeconds / 60)} minutes)`);
				}

				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						episode_title: needsTitle ? details.title : title || details.title,
						duration_seconds: needsDuration && details.duration > 0 ? details.duration : episode?.duration_seconds,
					},
				});
			} catch (_err) {
				const errorMessage = _err instanceof Error ? _err.message : "metadata enrichment error";
				const isDurationError = errorMessage.includes("exceeds maximum allowed duration");

				if (isDurationError) {
					// Duration validation failed - fail the entire transcription job
					await step.run("mark-failed-duration", async () => {
						await prisma.userEpisode.update({ where: { episode_id: userEpisodeId }, data: { status: "FAILED" } });
					});

					await step.run("email-duration-failed", async () => {
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
							console.error("[DURATION_FAIL_EMAIL]", err);
						}
					});

					return { ok: false, jobId, error: errorMessage };
				}
			}
		});

		// Direct Gemini transcription - no fallbacks, no orchestrator complexity
		await step.sendEvent("start-gemini", {
			name: Events.ProviderStart.Gemini,
			data: { jobId, userEpisodeId, srcUrl, provider: "gemini" },
		});

		// Wait for either Gemini to succeed or fail, whichever happens first
		const windowSec = getProviderWindowSeconds();
		const result = await Promise.race([
			step.waitForEvent("wait-gemini-success", {
				event: Events.Succeeded,
				timeout: `${windowSec}s`,
				if: `event.data.jobId == "${jobId}"`,
			}),
			step.waitForEvent("wait-gemini-failure", {
				event: Events.Failed,
				timeout: `${windowSec}s`,
				if: `event.data.jobId == "${jobId}"`,
			}),
		]);

		const successEvent = result && (result as { name?: string }).name === Events.Succeeded ? result : null;

		const runFallback = async (reason: string) => {
			const { getTranscriptOrchestrated } = await import("@/lib/inngest/transcripts");
			const fallback = await step.run("fallback-orchestrator", async () => {
				return await getTranscriptOrchestrated({ url: srcUrl, kind: "youtube" });
			});

			if (!fallback.success) {
				await step.run("mark-failed", async () => {
					await prisma.userEpisode.update({ where: { episode_id: userEpisodeId }, data: { status: "FAILED" } });
				});

				await step.run("email-user-failed", async () => {
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
						console.error("[EMAIL_FAIL_NOTIFY]", err);
					}
				});
				await step.sendEvent("finalize-failed", {
					name: Events.Finalized,
					data: { jobId, userEpisodeId, status: "failed" },
				});
				return { ok: false, jobId };
			}

			const transcriptText = (fallback as { transcript?: string; provider?: string }).transcript as string;
			const provider = (fallback as { provider?: string }).provider ?? "fallback-orchestrator";
			await step.run("store-transcript", async () => {
				await prisma.userEpisode.update({ where: { episode_id: userEpisodeId }, data: { transcript: transcriptText } });
			});
			await step.sendEvent("forward-generation", {
				name: generationMode === "multi" ? "user.episode.generate.multi.requested" : "user.episode.generate.requested",
				data: { userEpisodeId, voiceA, voiceB },
			});
			await step.sendEvent("finalize-success", {
				name: Events.Finalized,
				data: { jobId, userEpisodeId, status: "succeeded", provider },
			});
			return { ok: true, jobId };
		};

		if (!successEvent) {
			return await runFallback("provider-failure-or-timeout");
		}

		// Gemini succeeded - process the result
		const successPayload = ProviderSucceededSchema.parse((successEvent as { data: unknown }).data);
		let transcriptText: string | null = successPayload.transcript ?? null;

		if (!transcriptText) {
			transcriptText = await step.run("load-transcript", async () => {
				const record = await prisma.userEpisode.findUnique({
					where: { episode_id: userEpisodeId },
					select: { transcript: true },
				});
				return record?.transcript ?? null;
			});

			if (!transcriptText) {
				return await runFallback("missing-transcript");
			}
		}

		const ensuredTranscript = transcriptText;

		await step.run("store-transcript", async () => {
			await prisma.userEpisode.update({ where: { episode_id: userEpisodeId }, data: { transcript: ensuredTranscript } });
		});

		await step.sendEvent("forward-generation", {
			name: generationMode === "multi" ? "user.episode.generate.multi.requested" : "user.episode.generate.requested",
			data: { userEpisodeId, voiceA, voiceB },
		});

		await step.sendEvent("finalize-success", {
			name: Events.Finalized,
			data: { jobId, userEpisodeId, status: "succeeded", provider: successPayload.provider },
		});

		return { ok: true, jobId };
	}
);
