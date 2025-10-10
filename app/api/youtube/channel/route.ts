import { NextResponse } from "next/server";
import { extractYouTubeVideoId } from "@/lib/inngest/utils/youtube";

// Cache for YouTube channel data (in-memory cache)
const channelCache = new Map<string, { channelName: string; channelImage: string; timestamp: number }>();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Function to clean YouTube URL for fallback display
function cleanYouTubeUrl(url: string): string {
	// Accept plain 11-char IDs directly
	if (/^[\w-]{11}$/.test(url)) {
		return `yu.tube/${url}`;
	}
	try {
		const parsedUrl = new URL(url);
		if (parsedUrl.hostname.includes("youtube.com")) {
			const videoId = parsedUrl.searchParams.get("v");
			return videoId ? `yu.tube/${videoId}` : "yu.tube/video";
		}
		if (parsedUrl.hostname.includes("youtu.be")) {
			const videoId = parsedUrl.pathname.replace(/^\//, "");
			return videoId ? `yu.tube/${videoId}` : "yu.tube/video";
		}
	} catch {
		// Quietly fall back for invalid URLs (e.g., 'news')
	}
	return "yu.tube/video";
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const youtubeUrl = searchParams.get("url");

	if (!youtubeUrl) {
		return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
	}

	try {
		// Short-circuit for known non-YouTube sources (e.g., 'news')
		const lower = youtubeUrl.toLowerCase();
		const isId = /^[\w-]{11}$/.test(youtubeUrl);
		let isYouTubeLike = isId;
		if (!isYouTubeLike) {
			try {
				const u = new URL(youtubeUrl);
				isYouTubeLike = u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be");
			} catch {
				isYouTubeLike = false;
			}
		}
		if (lower === "news" || !isYouTubeLike) {
			return NextResponse.json({ error: "Not a YouTube URL", fallback: cleanYouTubeUrl(youtubeUrl) }, { status: 400 });
		}

		const apiKey = process.env.YOUTUBE_API_KEY;
		if (!apiKey) {
			console.error("YouTube API key is missing");
			return NextResponse.json(
				{
					error: "YouTube API not configured",
					fallback: cleanYouTubeUrl(youtubeUrl),
				},
				{ status: 500 }
			);
		}

		// Check cache first
		const cached = channelCache.get(youtubeUrl);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
			return NextResponse.json({
				channelName: cached.channelName,
				channelImage: cached.channelImage,
				cached: true,
			});
		}

		const videoId = extractYouTubeVideoId(youtubeUrl);
		if (!videoId) {
			return NextResponse.json(
				{
					error: "Invalid YouTube URL format",
					fallback: cleanYouTubeUrl(youtubeUrl),
				},
				{ status: 400 }
			);
		}

		// API Call 1: Get video details to find the channel ID
		const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
		const videoResponse = await fetch(videoDetailsUrl);
		const videoData = await videoResponse.json();

		const hasValidVideoData = videoResponse.ok && videoData.items?.length;
		if (!hasValidVideoData) {
			return NextResponse.json(
				{
					error: "Video not found or API error",
					fallback: cleanYouTubeUrl(youtubeUrl),
				},
				{ status: 404 }
			);
		}

		const channelId = videoData.items[0].snippet.channelId;
		if (!channelId) {
			return NextResponse.json(
				{
					error: "Channel ID not found",
					fallback: cleanYouTubeUrl(youtubeUrl),
				},
				{ status: 404 }
			);
		}

		// API Call 2: Get channel details using the channel ID
		const channelDetailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
		const channelResponse = await fetch(channelDetailsUrl);
		const channelData = await channelResponse.json();

		const hasValidChannelData = channelResponse.ok && channelData.items?.length;
		if (!hasValidChannelData) {
			return NextResponse.json(
				{
					error: "Channel details not found",
					fallback: cleanYouTubeUrl(youtubeUrl),
				},
				{ status: 404 }
			);
		}

		const channelName = channelData.items[0].snippet.title;
		const channelImage = channelData.items[0].snippet.thumbnails?.high?.url || channelData.items[0].snippet.thumbnails?.default?.url || channelData.items[0].snippet.thumbnails?.medium?.url || null;

		// Cache the result
		channelCache.set(youtubeUrl, {
			channelName,
			channelImage,
			timestamp: Date.now(),
		});

		return NextResponse.json({
			channelName,
			channelImage,
			cached: false,
		});
	} catch (error) {
		console.error("Error fetching YouTube channel data:", error);
		const fallbackUrl = youtubeUrl ? cleanYouTubeUrl(youtubeUrl) : "yu.tube/video";
		return NextResponse.json(
			{
				error: "Internal server error",
				fallback: fallbackUrl,
			},
			{ status: 500 }
		);
	}
}
