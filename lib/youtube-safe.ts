/**
 * Vercel-safe YouTube utilities that avoid ytdl-core server-side scraping
 */

import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

export async function getYouTubeVideoTitle(videoUrl: string): Promise<string> {
	// Try oEmbed first (reliable, no API key), then fall back to parsing HTML
	try {
		const viaOEmbed = await getYouTubeTitleViaOEmbed(videoUrl);
		if (viaOEmbed) return viaOEmbed;
	} catch {}

	try {
		const viaHtml = await getYouTubeTitleViaHTML(videoUrl);
		if (viaHtml) return viaHtml;
	} catch {}

	return "Untitled YouTube Video";
}

export async function getYouTubeTitleViaOEmbed(videoUrl: string): Promise<string | null> {
	const endpoint = new URL("https://www.youtube.com/oembed");
	endpoint.searchParams.set("url", videoUrl);
	endpoint.searchParams.set("format", "json");

	const res = await fetch(endpoint.toString(), { next: { revalidate: 3600 } });
	if (!res.ok) return null;

	const data = await res.json();
	const OEmbedSchema = z.object({ title: z.string() });
	const parsed = OEmbedSchema.safeParse(data);
	if (!parsed.success) return null;
	return parsed.data.title;
}

export async function getYouTubeTitleViaHTML(videoUrl: string): Promise<string | null> {
	const res = await fetch(videoUrl, { next: { revalidate: 3600 } });
	if (!res.ok) return null;

	const html = await res.text();

	// Prefer OpenGraph title
	let match = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
	if (match?.[1]) return decodeHTMLEntities(match[1]);

	// Fallback: meta name="title"
	match = html.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i);
	if (match?.[1]) return decodeHTMLEntities(match[1]);

	// Fallback: <title> tag
	match = html.match(/<title>([^<]+)<\/title>/i);
	if (match?.[1]) return decodeHTMLEntities(match[1]);

	return null;
}

function decodeHTMLEntities(text: string): string {
	return text
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&");
}

export function extractYouTubeVideoId(urlOrId: string): string | null {
	// If already a plausible 11-char ID, return as-is
	if (/^[\w-]{11}$/.test(urlOrId)) return urlOrId;

	const urlMatch = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.*?&v=))([\w-]{11})/);
	return urlMatch ? urlMatch[1] : null;
}

export type YouTubeTranscriptItem = { text: string; duration: number; offset: number };

/**
 * Parse an ISO-8601 YouTube duration (e.g., PT1H2M30S) to total seconds
 */
function parseISODurationToSeconds(iso: string): number {
	const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
	if (!match) return 0;
	const hours = match[1] ? parseInt(match[1], 10) : 0;
	const minutes = match[2] ? parseInt(match[2], 10) : 0;
	const seconds = match[3] ? parseFloat(match[3]) : 0;
	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch video duration via YouTube Data API v3 using contentDetails.duration
 * Returns duration in seconds, or null if unavailable/misconfigured.
 */
export async function getYouTubeVideoDurationSeconds(urlOrId: string): Promise<number | null> {
	const apiKey = process.env.YOUTUBE_API_KEY;
	if (!apiKey) return null;

	const videoId = extractYouTubeVideoId(urlOrId);
	if (!videoId) return null;

	const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
	endpoint.searchParams.set("part", "contentDetails");
	endpoint.searchParams.set("id", videoId);
	endpoint.searchParams.set("key", apiKey);

	const res = await fetch(endpoint.toString(), { next: { revalidate: 3600 } });
	if (!res.ok) return null;

	const data = (await res.json()) as { items?: Array<{ contentDetails?: { duration?: string } }> };
	const iso = data.items?.[0]?.contentDetails?.duration;
	if (!iso) return null;
	return parseISODurationToSeconds(iso);
}

/**
 * Vercel-safe transcript extraction using YouTube's innertube API
 */
export async function getYouTubeTranscriptSegments(videoUrlOrId: string, lang?: string): Promise<YouTubeTranscriptItem[]> {
	const videoId = extractYouTubeVideoId(videoUrlOrId);
	if (!videoId) {
		throw new Error("Invalid YouTube URL or video ID");
	}

	try {
		// Use YouTube's innertube API
		const response = await fetch("https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			},
			body: JSON.stringify({
				context: {
					client: {
						clientName: "WEB",
						clientVersion: "2.20240101.00.00",
					},
				},
				videoId: videoId,
			}),
		});

		if (!response.ok) {
			throw new Error(`YouTube API request failed: ${response.status}`);
		}

		const data = await response.json();
		const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

		if (!captionTracks || captionTracks.length === 0) {
			throw new Error("No captions found");
		}

		interface CaptionTrack {
			languageCode?: string;
			kind?: string;
			baseUrl?: string;
		}

		// Find best caption track
		let selectedTrack = captionTracks.find((track: CaptionTrack) => track.languageCode === (lang || "en") && track.kind === "asr");
		if (!selectedTrack) {
			selectedTrack = captionTracks.find((track: CaptionTrack) => track.languageCode === (lang || "en"));
		}
		if (!selectedTrack) {
			selectedTrack = captionTracks.find((track: CaptionTrack) => track.kind === "asr");
		}
		if (!selectedTrack) {
			selectedTrack = captionTracks[0];
		}

		if (!selectedTrack?.baseUrl) {
			throw new Error("No suitable caption track found");
		}

		// Fetch the transcript XML
		const transcriptResponse = await fetch(selectedTrack.baseUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			},
		});

		if (!transcriptResponse.ok) {
			throw new Error(`Transcript fetch failed: ${transcriptResponse.status}`);
		}

		const xmlText = await transcriptResponse.text();
		return parseTranscriptXML(xmlText);
	} catch (error) {
		throw new Error(`YouTube transcript extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

export async function getYouTubeTranscriptText(videoUrlOrId: string, lang?: string): Promise<string> {
	const segments = await getYouTubeTranscriptSegments(videoUrlOrId, lang);
	return segments.map(s => s.text).join(" ");
}

async function parseTranscriptXML(xmlData: string): Promise<YouTubeTranscriptItem[]> {
	if (!xmlData || xmlData.trim().length === 0) {
		throw new Error("Empty caption data received");
	}

	try {
		// Try to parse using regex first (more reliable for YouTube's format)
		const textMatches = xmlData.match(/<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g);
		if (textMatches) {
			return textMatches.map((match, _index) => {
				const startMatch = match.match(/start="([^"]*)"/);
				const durMatch = match.match(/dur="([^"]*)"/);
				const textMatch = match.match(/>([^<]*)<\/text>/);

				return {
					text: decodeHTMLEntities(textMatch?.[1] || ""),
					offset: parseFloat(startMatch?.[1] || "0"),
					duration: parseFloat(durMatch?.[1] || "1"),
				};
			});
		}

		// Fallback to XML parser
		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: "",
		});

		const parsed = parser.parse(xmlData);
		const texts = parsed.transcript?.text || [];

		if (!Array.isArray(texts)) {
			throw new Error("Invalid caption format");
		}

		interface ParsedItem {
			"#text"?: string;
			dur?: string;
			start?: string;
		}

		return texts.map((item: string | ParsedItem, index: number) => ({
			text: decodeHTMLEntities(typeof item === "string" ? item : item["#text"] || ""),
			duration: typeof item === "object" && item.dur ? parseFloat(item.dur) : 1,
			offset: typeof item === "object" && item.start ? parseFloat(item.start) : index,
		}));
	} catch (error) {
		throw new Error(`Failed to parse caption XML: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

// Re-export functions from the original module for backward compatibility
export const getYouTubeTitleViaOEmbedLegacy = getYouTubeTitleViaOEmbed;
export const getYouTubeTitleViaHTMLLegacy = getYouTubeTitleViaHTML;
