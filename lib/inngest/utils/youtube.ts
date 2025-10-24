import type { youtube_v3 } from "googleapis";
import { google } from "googleapis";

let youtube: youtube_v3.Youtube | undefined;

/**
 * Lazily initializes and returns a singleton YouTube Data API v3 client.
 * @throws {Error} If the YOUTUBE_API_KEY environment variable is not set.
 */
function getYouTubeClient(): youtube_v3.Youtube {
	const apiKey = process.env.YOUTUBE_API_KEY;
	if (!apiKey) {
		console.error("YOUTUBE_API_KEY environment variable is not set.");
		throw new Error("YouTube API key is missing.");
	}

	if (!youtube) {
		youtube = google.youtube({
			version: "v3",
			auth: apiKey,
		});
	}
	return youtube;
}

export const youtubeClient = getYouTubeClient();

export interface VideoDetails {
	title: string;
	description: string;
	duration: number; // Duration in seconds
	channelName: string;
	thumbnailUrl: string;
}

/**
 * Parses an ISO 8601 duration string (e.g., "PT2M34S") into seconds.
 * The YouTube API returns duration in this format.
 * @param duration The ISO 8601 duration string.
 * @returns The total duration in seconds.
 */
function parseISO8601Duration(duration: string): number {
	const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
	const matches = duration.match(regex);

	if (!matches) {
		return 0;
	}

	const hours = parseInt(matches[1] || "0", 10);
	const minutes = parseInt(matches[2] || "0", 10);
	const seconds = parseInt(matches[3] || "0", 10);

	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetches basic video details from the YouTube Data API.
 * @param url The YouTube video URL.
 * @returns The video details or null if not found.
 */
export async function getYouTubeVideoDetails(url: string): Promise<VideoDetails | null> {
	console.log("[DEBUG] getYouTubeVideoDetails called with URL:", url);
	const videoId = extractYouTubeVideoId(url);
	console.log("[DEBUG] getYouTubeVideoDetails extracted videoId:", videoId);
	if (!videoId) {
		console.log("[DEBUG] getYouTubeVideoDetails: No videoId extracted");
		return null;
	}

	try {
		console.log(
			"[DEBUG] getYouTubeVideoDetails: Calling YouTube API for videoId:",
			videoId
		);
		const response = await youtubeClient.videos.list({
			part: ["snippet", "contentDetails"],
			id: [videoId],
		});

		console.log(
			"[DEBUG] getYouTubeVideoDetails: YouTube API response received, items count:",
			response.data.items?.length
		);

		const item = response.data.items?.[0];
		if (!(item?.snippet && item.contentDetails)) {
			console.warn(`[DEBUG] Incomplete video details for ID: ${videoId}`);
			return null;
		}
		const { snippet, contentDetails } = item;

		const isoDuration = contentDetails.duration || "PT0S";
		const durationInSeconds = parseISO8601Duration(isoDuration);

		console.log(
			"[DEBUG] getYouTubeVideoDetails: Parsed duration:",
			durationInSeconds,
			"seconds from ISO:",
			isoDuration
		);

		const result = {
			title: snippet.title || "Untitled",
			description: snippet.description || "",
			duration: durationInSeconds,
			channelName: snippet.channelTitle || "Unknown Channel",
			thumbnailUrl: snippet.thumbnails?.high?.url || "",
		};

		console.log("[DEBUG] getYouTubeVideoDetails: Returning result:", result);
		return result;
	} catch (error) {
		console.error(
			`[YOUTUBE_API_ERROR] Failed to fetch details for video ${videoId}:`,
			error
		);
		return null;
	}
}

/**
 * Extracts the 11-character video ID from various YouTube URL formats.
 * @param urlOrId The YouTube URL or a video ID.
 * @returns The video ID string, or null if not found.
 */
export function extractYouTubeVideoId(urlOrId: string): string | null {
	// If already a plausible 11-char ID, return as-is
	if (/^[\w-]{11}$/.test(urlOrId)) return urlOrId;

	// Regex for various YouTube URL formats
	const urlMatch = urlOrId.match(
		/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.*?&v=))([\w-]{11})/
	);
	return urlMatch ? (urlMatch[1] ?? null) : null;
}

// Transcripts removed: Use Gemini-based transcription pipeline instead.
export type YouTubeTranscriptItem = never;

export async function getYouTubeTranscriptText(): Promise<string> {
	throw new Error(
		"TRANSCRIPTS_DISABLED: Server-side caption scraping removed. Use Gemini transcription pipeline."
	);
}

export async function getYouTubeTranscriptSegments(): Promise<YouTubeTranscriptItem[]> {
	throw new Error("TRANSCRIPTS_DISABLED");
}
