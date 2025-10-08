import { transcribeWithGeminiFromUrlChunked } from "../gemini-video";
import type { TranscriptProvider, TranscriptRequest, TranscriptResponse } from "../types";

/**
 * Gemini Video Provider - Direct transcription from YouTube URLs
 * Uses Gemini's native video understanding capabilities
 */
export const GeminiVideoProvider: TranscriptProvider = {
	name: "gemini-video",

	async canHandle(request: TranscriptRequest): Promise<boolean> {
		// Only handle YouTube URLs
		return /youtu(\.be|be\.com)/i.test(request.url);
	},

	async getTranscript(request: TranscriptRequest): Promise<TranscriptResponse> {
		try {
			// Prefer chunked transcription to avoid long video timeouts
			const transcript = await transcribeWithGeminiFromUrlChunked(request.url, {
				chunkSeconds: 1800,
				overlapSeconds: 5,
			});

			if (!transcript) {
				return {
					success: false,
					error: "Gemini returned empty transcript",
					provider: this.name,
				};
			}

			return {
				success: true,
				transcript,
				provider: this.name,
				meta: {
					url: request.url,
					characters: transcript.length,
				},
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown Gemini error";
			return {
				success: false,
				error: errorMessage,
				provider: this.name,
			};
		}
	},
};
