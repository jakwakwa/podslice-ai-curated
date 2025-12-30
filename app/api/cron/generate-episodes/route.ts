import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

type Summary = {
	success: boolean;
	totalUsers: number;
	episodesTriggered: number;
	skippedNoVideos: number;
	skippedNoPlan: number;
	errors: Array<{ user_id: string; message: string }>;
};

export const dynamic = "force-dynamic";

/**
 * Daily cron job to generate episodes from the latest unprocessed YouTube videos
 * Runs at 12:30 AM UTC, after the youtube-feed cron job fetches new videos at midnight
 */
export async function GET(request: Request) {
	// Authentication: check for cron secret or Vercel Cron header
	const url = new URL(request.url);
	const authHeader = request.headers.get("authorization");
	const secretParam = url.searchParams.get("secret");
	const isVercelCron = request.headers.get("x-vercel-cron") === "1";

	const cronSecret = process.env.CRON_SECRET;
	const isAuthorized =
		isVercelCron ||
		(cronSecret && authHeader === `Bearer ${cronSecret}`) ||
		(cronSecret && secretParam === cronSecret);

	if (!isAuthorized) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const summary: Summary = {
		success: true,
		totalUsers: 0,
		episodesTriggered: 0,
		skippedNoVideos: 0,
		skippedNoPlan: 0,
		errors: [],
	};

	try {
		// Find all users with active ingestion configs that have RSS feed URLs
		const configs = await prisma.userIngestionConfig.findMany({
			where: {
				is_active: true,
				rss_feed_url: { not: null },
			},
			select: {
				user_id: true,
				topic: true,
				user: {
					select: {
						subscriptions: {
							orderBy: { updated_at: "desc" },
							take: 1,
							select: {
								plan_type: true,
								status: true,
							},
						},
					},
				},
			},
		});

		summary.totalUsers = configs.length;

		for (const config of configs) {
			try {
				// Check if user has curate_control plan with active/trialing status
				const subscription = config.user.subscriptions[0];
				const hasValidPlan = subscription?.plan_type === "curate_control";
				const hasActiveStatus = ["active", "trialing"].includes(
					subscription?.status?.toLowerCase() || ""
				);

				if (!(hasValidPlan && hasActiveStatus)) {
					summary.skippedNoPlan += 1;
					continue;
				}

				// Find the latest unprocessed video for this user
				const latestVideo = await prisma.youtubeFeedEntry.findFirst({
					where: {
						user_id: config.user_id,
						processed: false,
					},
					orderBy: {
						published_date: "desc", // Get the most recent video
					},
				});

				if (!latestVideo) {
					summary.skippedNoVideos += 1;
					continue;
				}

				const defaultSummaryLength = "MEDIUM" as const;
				const normalizedTitle = (latestVideo.video_title ?? "").trim();
				const fallbackSource = (config.topic ?? "").trim();
				const fallbackTitle = fallbackSource
					? `Latest insights from ${fallbackSource}`
					: "Latest YouTube video summary";
				const episodeTitle =
					normalizedTitle.length >= 2 ? normalizedTitle : fallbackTitle;

				// Create a UserEpisode record in PENDING state
				const userEpisode = await prisma.userEpisode.create({
					data: {
						user_id: config.user_id,
						episode_title: episodeTitle,
						youtube_url: latestVideo.video_url,
						status: "PENDING",
						summary_length: defaultSummaryLength, // Default summary length
						auto_generated: true, // Mark as auto-generated to exclude from usage limits
					},
				});

				// Kick off metadata-driven transcription + generation workflow
				await inngest.send({
					name: "user.episode.metadata.requested",
					data: {
						userEpisodeId: userEpisode.episode_id,
						title: episodeTitle,
						podcastName: fallbackSource || undefined,
						youtubeUrl: latestVideo.video_url,
						publishedAt: latestVideo.published_date
							? latestVideo.published_date.toISOString()
							: undefined,
						generationMode: "single",
						summaryLength: defaultSummaryLength,
					},
				});

				// Mark the video as processed
				await prisma.youtubeFeedEntry.update({
					where: { id: latestVideo.id },
					data: { processed: true },
				});

				summary.episodesTriggered += 1;
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error";
				summary.errors.push({ user_id: config.user_id, message });
				// Continue to next user; do not fail whole cron
			}
		}

		return NextResponse.json(summary);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[GENERATE_EPISODES_CRON]", message);
		return NextResponse.json(
			{
				success: false,
				error: message,
			},
			{ status: 500 }
		);
	}
}
