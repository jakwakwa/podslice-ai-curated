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
 * Runs after the youtube-feed cron job fetches new videos
 */
export async function GET(request: Request) {
	// Basic protection: only allow Vercel Cron or explicit override via ?force=1
	const url = new URL(request.url);
	const force = url.searchParams.get("force") === "1";
	const isVercelCron = request.headers.get("x-vercel-cron") === "1";
	if (!isVercelCron && !force) {
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
				user: {
					select: {
						subscriptions: {
							orderBy: { updated_at: "desc" },
							take: 1,
							select: {
								plan_type: true,
								status: true,
							}
						}
					}
				}
			},
		});

		summary.totalUsers = configs.length;

		for (const config of configs) {
			try {
				// Check if user has curate_control plan with active/trialing status
				const subscription = config.user.subscriptions[0];
				const hasValidPlan = subscription?.plan_type === "curate_control";
				const hasActiveStatus = ["active", "trialing"].includes(subscription?.status?.toLowerCase() || "");
				
				if (!hasValidPlan || !hasActiveStatus) {
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

				// Create a UserEpisode record in PENDING state
				const userEpisode = await prisma.userEpisode.create({
					data: {
						user_id: config.user_id,
						episode_title: latestVideo.video_title,
						youtube_url: latestVideo.video_url,
						status: "PENDING",
						summary_length: "MEDIUM", // Default summary length
						auto_generated: true, // Mark as auto-generated to exclude from usage limits
					},
				});

				// Trigger Inngest episode generation workflow
				await inngest.send({
					name: "user.episode.generate.requested",
					data: {
						userEpisodeId: userEpisode.episode_id,
						summaryLength: "MEDIUM",
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

