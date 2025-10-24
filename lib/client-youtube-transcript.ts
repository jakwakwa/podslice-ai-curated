import type { youtube_v3 } from "googleapis";
import { extractYouTubeVideoId, youtubeClient } from "@/lib/inngest/utils/youtube";

export interface TranscriptSegment {
	text: string;
	start: number;
	duration: number;
}

export interface TranscriptResult {
	success: boolean;
	transcript?: string;
	segments?: TranscriptSegment[];
	error?: string;
}

/**
 * Fetches available caption tracks for a YouTube video.
 * @param videoId The ID of the YouTube video.
 * @returns A list of caption tracks.
 */
async function getCaptionTracks(videoId: string) {
	const response = await youtubeClient.captions.list({
		part: ["snippet"],
		videoId: videoId,
	});
	return response.data.items || [];
}

/**
 * Downloads the content of a specific caption track.
 * @param captionId The ID of the caption track.
 * @returns The caption content as a string.
 */
async function downloadCaptionTrack(captionId: string): Promise<string> {
	const response = await youtubeClient.captions.download({
		id: captionId,
		tfmt: "srt", // Request SubRip format, can also be 'vtt'
	});
	return response.data as string;
}

/**
 * Parses SRT content into structured transcript segments.
 * @param srtContent The SRT-formatted string.
 * @returns An array of transcript segments.
 */
function parseSrt(srtContent: string): TranscriptSegment[] {
	const segments: TranscriptSegment[] = [];
	const lines = srtContent.trim().split(/\r?\n/);

	let i = 0;
	while (i < lines.length) {
		// Skip sequence number
		i++;

		// Timecodes line
		const timeLine = lines[i++];
		if (!timeLine) continue;

		const timeSplit = timeLine.split(" --> ");
		if (timeSplit.length < 2) continue;
		const startTime = timeSplit[0];
		const endTime = timeSplit[1];
		const start = timeToSeconds(startTime!);
		const end = timeToSeconds(endTime!);

		// Text lines
		let text = "";
		while (i < lines.length && lines[i]?.trim() !== "") {
			text += `${lines[i++] ?? ""} `;
		}

		segments.push({
			text: text.trim(),
			start,
			duration: end - start,
		});

		// Skip empty line between segments
		i++;
	}

	return segments;
}

function timeToSeconds(timeStr: string): number {
	const parts = timeStr.split(":");
	const secondsAndMs = parts[2]!.split(",");
	const hours = parseInt(parts[0]!, 10);
	const minutes = parseInt(parts[1]!, 10);
	const seconds = parseInt(secondsAndMs[0]!, 10);
	const milliseconds = parseInt(secondsAndMs[1]!, 10);
	return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Main function to get a transcript for a YouTube video.
 * @param url The URL of the YouTube video.
 * @returns A result object with the transcript and segments.
 */
export async function getYouTubeTranscript(url: string): Promise<TranscriptResult> {
	const videoId = extractYouTubeVideoId(url);
	if (!videoId) {
		return { success: false, error: "Invalid YouTube URL" };
	}

	try {
		const tracks = await getCaptionTracks(videoId);
		if (tracks.length === 0) {
			return { success: false, error: "No captions available for this video." };
		}

		// Prefer English, but take any available track
		const track =
			tracks.find((t: youtube_v3.Schema$Caption) => t.snippet?.language === "en") ||
			tracks[0];
		const captionId = track!.id;
		if (!captionId) {
			return { success: false, error: "Could not find a valid caption track ID." };
		}

		const srtContent = await downloadCaptionTrack(captionId);
		const segments = parseSrt(srtContent);
		const fullTranscript = segments.map(s => s.text).join(" ");

		return {
			success: true,
			transcript: fullTranscript,
			segments: segments,
		};
	} catch (error) {
		console.error("Error fetching YouTube transcript:", error);
		return { success: false, error: "Failed to fetch or process transcript." };
	}
}
