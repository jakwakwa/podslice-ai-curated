// lib/inngest/utils/results.ts
import { z } from "zod";

export type ErrorType =
	| "invalid_input"
	| "expired_url"
	| "provider_unavailable"
	| "timeout"
	| "unknown";

export type Ok<T> = { ok: true; value: T };
export type Err = {
	ok: false;
	errorType: ErrorType;
	errorMessage: string;
	meta?: Record<string, unknown>;
};
export type Result<T> = Ok<T> | Err;

export const success = <T>(value: T): Ok<T> => ({ ok: true, value });
export const failure = (
	errorType: ErrorType,
	errorMessage: string,
	meta?: Record<string, unknown>
): Err => ({
	ok: false,
	errorType,
	errorMessage,
	meta,
});

export function classifyError(e: unknown): {
	errorType: ErrorType;
	errorMessage: string;
} {
	const msg = e instanceof Error ? e.message : String(e);
	if (/403|401|expired|signature|denied/i.test(msg))
		return { errorType: "expired_url", errorMessage: msg };
	if (/timeout|timed out|ETIMEDOUT|ECONNABORTED/i.test(msg))
		return { errorType: "timeout", errorMessage: msg };
	if (/5\d\d|unavailable|overloaded|rate|429/i.test(msg))
		return { errorType: "provider_unavailable", errorMessage: msg };
	if (/html|text\/html|not audio|no audio|invalid/i.test(msg))
		return { errorType: "invalid_input", errorMessage: msg };
	return { errorType: "unknown", errorMessage: msg };
}

// Reusable zod payloads
export const TranscriptionRequestedSchema = z.object({
	jobId: z.string().min(1),
	userEpisodeId: z.string().min(1),
	srcUrl: z.string().url(),
	lang: z.string().optional(),
	generationMode: z.enum(["single", "multi"]).optional(),
	voiceA: z.string().optional(),
	voiceB: z.string().optional(),
});

export type TranscriptionRequested = z.infer<typeof TranscriptionRequestedSchema>;

export const ProviderStartedSchema = z.object({
	jobId: z.string().min(1),
	userEpisodeId: z.string().min(1),
	srcUrl: z.string().url(),
	provider: z.enum(["gemini"]),
	lang: z.string().optional(),
});

export type ProviderStarted = z.infer<typeof ProviderStartedSchema>;

export const ProviderSucceededSchema = z.object({
	jobId: z.string().min(1),
	userEpisodeId: z.string().min(1),
	provider: z.enum(["gemini"]),
	transcript: z.string().min(1).optional(),
	transcriptLength: z.number().int().nonnegative().optional(),
	transcriptStorage: z.enum(["db"]).optional(),
	meta: z.record(z.any()).optional(),
});

export type ProviderSucceeded = z.infer<typeof ProviderSucceededSchema>;

export const ProviderFailedSchema = z.object({
	jobId: z.string().min(1),
	userEpisodeId: z.string().min(1),
	provider: z.enum(["gemini"]),
	errorType: z.custom<ErrorType>(),
	errorMessage: z.string(),
	meta: z.record(z.any()).optional(),
});

export type ProviderFailed = z.infer<typeof ProviderFailedSchema>;
