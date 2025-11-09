import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
	constructRssUrl,
	extractChannelId,
	extractPlaylistId,
	fetchAndParseRssFeed,
} from "@/lib/youtube-rss-parser";

type Summary = {
	success: boolean;
	totalConfigs: number;
	skippedNoUrl: number;
	skippedInvalid: number;
	successConfigs: number;
	totalEntriesInserted: number;
	errors: Array<{ user_id: string; message: string }>;
	results?: Array<{ user_id: string; newEntries: number }>;
};

export const dynamic = "force-dynamic";

/**
 * Daily cron job to fetch new YouTube videos from user RSS feeds
 * Runs at midnight UTC (00:00), before the generate-episodes cron at 12:30 AM
 */
export async function GET(request: Request) {
	// Authentication: Verify cron secret as per Vercel docs
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	// Debug logging (remove after fixing)
	console.log("Auth Debug:", {
		hasAuthHeader: !!authHeader,
		hasCronSecret: !!cronSecret,
		authHeaderValue: authHeader ? `${authHeader.substring(0, 20)}...` : "none",
		expectedValue: cronSecret ? `Bearer ${cronSecret.substring(0, 10)}...` : "none",
	});

	if (!cronSecret) {
		console.error("CRON_SECRET environment variable is not set");
		return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		console.warn("Unauthorized cron attempt:", {
			receivedHeader: authHeader ? authHeader.substring(0, 20) : "none",
		});
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const summary: Summary = {
		success: true,
		totalConfigs: 0,
		skippedNoUrl: 0,
		skippedInvalid: 0,
		successConfigs: 0,
		totalEntriesInserted: 0,
		errors: [],
		results: [],
	};

	const configs = await prisma.userIngestionConfig.findMany({
		where: { is_active: true, rss_feed_url: { not: null } },
		select: { user_id: true, rss_feed_url: true },
	});

	summary.totalConfigs = configs.length;

	for (const config of configs) {
		const sourceUrl = config.rss_feed_url;
		if (!sourceUrl) {
			summary.skippedNoUrl += 1;
			continue;
		}

		try {
			// Determine final RSS URL
			let rssUrl: string | null = null;

			if (sourceUrl.includes("feeds/videos.xml")) {
				// Already an RSS feed URL
				rssUrl = sourceUrl;
			} else {
				// Try extracting playlist ID first
				const playlistId = extractPlaylistId(sourceUrl);
				if (playlistId) {
					rssUrl = constructRssUrl(playlistId);
				} else {
					// Try extracting channel ID (handles @username and /channel/ URLs)
					const channelId = await extractChannelId(sourceUrl);
					if (channelId) {
						rssUrl = constructRssUrl(channelId);
					}
				}
			}

			if (!rssUrl) {
				summary.skippedInvalid += 1;
				continue;
			}

			const entries = await fetchAndParseRssFeed(rssUrl);
			if (entries.length === 0) {
				summary.successConfigs += 1;
				continue;
			}

			const data = entries.map(e => ({
				user_id: config.user_id,
				video_url: e.videoUrl,
				video_title: e.title,
				published_date: e.publishedDate ?? null,
			}));

			const result = await prisma.youtubeFeedEntry.createMany({
				data,
				skipDuplicates: true,
			});

			summary.totalEntriesInserted += result.count;
			summary.successConfigs += 1;
			summary.results?.push({ user_id: config.user_id, newEntries: result.count });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			summary.errors.push({ user_id: config.user_id, message });
			// Continue to next user; do not fail whole cron
		}
	}

	return NextResponse.json(summary);
}
