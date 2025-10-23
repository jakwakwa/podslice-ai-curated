import type { TranscriptProvider, TranscriptRequest, TranscriptResponse } from "../types";

function extractVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
		/^([a-zA-Z0-9_-]{11})$/,
	];
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1] ?? null;
	}
	return null;
}

async function fetchYouTubeCaption(videoId: string): Promise<string> {
	// Try YouTube's innertube API which works better from servers
	const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
	if (!YOUTUBE_API_KEY) {
		throw new Error("Missing YOUTUBE_API_KEY environment variable");
	}
	const response = await fetch(
		`https://www.youtube.com/youtubei/v1/player?key=${YOUTUBE_API_KEY}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				Origin: "https://www.youtube.com",
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
		}
	);

	if (!response.ok) {
		throw new Error(`YouTube API request failed: ${response.status}`);
	}

	const data = await response.json();
	const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

	if (!captionTracks || captionTracks.length === 0) {
		throw new Error("No captions found");
	}

	// Find best caption track (prefer English auto-generated)
	interface CaptionTrack {
		languageCode?: string;
		kind?: string;
		baseUrl?: string;
	}

	const selectedTrack: CaptionTrack =
		captionTracks.find(
			(track: CaptionTrack) => track.languageCode === "en" && track.kind === "asr"
		) ||
		captionTracks.find((track: CaptionTrack) => track.languageCode === "en") ||
		captionTracks[0];

	if (!selectedTrack?.baseUrl) {
		throw new Error("No suitable caption track found");
	}

	// Fetch the actual transcript
	const transcriptResponse = await fetch(selectedTrack.baseUrl, {
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		},
	});

	if (!transcriptResponse.ok) {
		throw new Error(`Transcript fetch failed: ${transcriptResponse.status}`);
	}

	const xmlText = await transcriptResponse.text();

	// Parse XML to extract text
	const textMatches = xmlText.match(/<text[^>]*>([^<]+)</g);
	if (!textMatches) {
		throw new Error("No transcript text found");
	}

	const transcript = textMatches
		.map(match => {
			const textContent = match.replace(/<text[^>]*>/, "").replace(/<\/text>/, "");
			// Decode HTML entities
			return textContent
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&amp;/g, "&");
		})
		.join(" ")
		.trim();

	return transcript;
}

export const YouTubeClientProvider: TranscriptProvider = {
	name: "youtube-client",
	canHandle(request) {
		return /youtu(\.be|be\.com)/i.test(request.url);
	},
	async getTranscript(request: TranscriptRequest): Promise<TranscriptResponse> {
		try {
			const videoId = extractVideoId(request.url);
			if (!videoId) {
				return {
					success: false,
					error: "Invalid YouTube URL",
					provider: this.name,
				};
			}

			const transcript = await fetchYouTubeCaption(videoId);

			if (!transcript || transcript.length < 10) {
				return {
					success: false,
					error: "No meaningful transcript content found",
					provider: this.name,
				};
			}

			return {
				success: true,
				transcript,
				provider: this.name,
				meta: { videoId, method: "server-side-captions" },
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "YouTube caption extraction failed",
				provider: this.name,
			};
		}
	},
};
