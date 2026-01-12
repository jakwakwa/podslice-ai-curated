/**
 * Orchestrator service — server-side transcription entrypoint.
 *
 * Purpose: provide a single server API that invokes the transcripts orchestrator
 * (captions-first, compliant with "process the stream, not the file").
 * Do NOT add logic here that downloads and persists full audio files.
 */

import { getTranscriptOrchestrated } from "./index";
import type { TranscriptRequest } from "./types";

export interface TranscriptionResult {
	success: boolean;
	transcript?: string;
	duration?: number;
	error?: string;
	audioSize?: number;
	provider?: string;
	meta?: Record<string, unknown>;
}

/**
 * Transcribe a video URL via the orchestrator (captions-first).
 */
export async function transcribeViaOrchestrator(
	videoUrl: string
): Promise<TranscriptionResult> {
	try {
		const request: TranscriptRequest = { url: videoUrl, kind: "youtube" };
		const result = await getTranscriptOrchestrated(request);
		if (result.success) {
			return {
				success: true,
				transcript: result.transcript,
				provider: result.provider,
				meta: result.meta || {},
			};
		}
		const lastAttempt = result.attempts?.[result.attempts.length - 1];
		return {
			success: false,
			error: lastAttempt?.error || result.error || "All transcription providers failed",
			meta: { attempts: result.attempts },
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown transcription error",
		};
	}
}

export async function validateForTranscription(videoUrl: string): Promise<{
	valid: boolean;
	estimatedCost?: number;
	duration?: number;
	error?: string;
}> {
	// For orchestrator-based validation, prefer captions; accept by default
	if (!/youtu(be\.be|be\.com)/i.test(videoUrl))
		return { valid: false, error: "Invalid YouTube URL" };
	return { valid: true, estimatedCost: 0 };
}
