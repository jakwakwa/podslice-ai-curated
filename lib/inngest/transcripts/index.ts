import { GeminiVideoProvider } from "./providers/gemini";
import { YouTubeClientProvider } from "./providers/youtube-client";
import type {
	OrchestratorResult,
	TranscriptProvider,
	TranscriptRequest,
	TranscriptResponse,
	TranscriptSourceKind,
} from "./types";

export function detectKindFromUrl(url: string): TranscriptSourceKind {
	if (/youtu(be\.be|be\.com)/i.test(url)) return "youtube";
	if (/(rss|feed|podcast|anchor|spotify|apple)\./i.test(url) || /\.rss(\b|$)/i.test(url))
		return "podcast";
	return "unknown";
}

function getProviderChain(kind: TranscriptSourceKind): TranscriptProvider[] {
	if (kind === "youtube") {
		// Only keep providers currently in use
		const providers: TranscriptProvider[] = [GeminiVideoProvider, YouTubeClientProvider];
		return providers;
	}
	if (kind === "podcast") {
		return [];
	}
	return [];
}

export async function getTranscriptOrchestrated(
	initialRequest: TranscriptRequest
): Promise<OrchestratorResult> {
	let request = { ...initialRequest };
	let kind = request.kind ?? detectKindFromUrl(request.url);
	let providers = getProviderChain(kind);

	const attempts: OrchestratorResult["attempts"] = [];

	for (const provider of providers) {
		try {
			console.debug(`[orchestrator] trying provider`, {
				provider: provider.name,
				url: request.url,
			});
			const applicable = await provider.canHandle(request);
			console.debug(`[orchestrator] provider.canHandle result`, {
				provider: provider.name,
				url: request.url,
				applicable,
			});
			if (!applicable) continue;
			const result: TranscriptResponse = await provider.getTranscript(request);
			console.debug(`[orchestrator] provider.getTranscript result`, {
				provider: provider.name,
				url: request.url,
				result,
			});
			attempts.push({
				provider: provider.name,
				success: result.success,
				error: result.success ? undefined : result.error,
			});
			if (result.success) {
				return { ...result, attempts };
			}
			const nextUrl = (result as { meta?: { nextUrl?: string } }).meta?.nextUrl;
			if (nextUrl) {
				request = { ...request, url: nextUrl };
				kind = detectKindFromUrl(nextUrl);
				providers = getProviderChain(kind);
			}
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : "Unknown provider error";
			attempts.push({ provider: provider.name, success: false, error: errMsg });
		}
	}

	return {
		success: false,
		error: "No transcript available from any provider",
		attempts,
	};
}

export type { TranscriptRequest, TranscriptResponse } from "./types";
