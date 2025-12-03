export type TranscriptSourceKind = "youtube" | "podcast" | "unknown";

export interface TranscriptRequest {
	url: string;
	kind?: TranscriptSourceKind;
	lang?: string;
	allowPaid?: boolean;
}

export interface TranscriptResponseSuccess {
	success: true;
	transcript: string;
	provider: ProviderName;
	meta?: Record<string, unknown>;
}

export interface TranscriptResponseFailure {
	success: false;
	error: string;
	provider?: ProviderName;
	meta?: Record<string, unknown>;
}

export type TranscriptResponse = TranscriptResponseSuccess | TranscriptResponseFailure;

export type ProviderName =
	| "gemini-video"
	| "youtube-captions"
	| "youtube-client"
	| "youtube-audio-extractor"
	| "youtube-stream-resolver"
	| "grok-search"
	| "paid-asr"
	| "openai-text-fallback";

export interface TranscriptProvider {
	name: ProviderName;
	// Quick check if the provider is applicable for this request
	canHandle(request: TranscriptRequest): Promise<boolean> | boolean;
	// Attempt to fetch/generate a transcript
	getTranscript(request: TranscriptRequest): Promise<TranscriptResponse>;
}

export type OrchestratorResult = TranscriptResponse & {
	attempts: Array<{ provider: ProviderName; success: boolean; error?: string }>;
};

export interface YouTubeProviderOptions {
	// If true, prefer client-side caption extraction strategy first
	preferClient?: boolean;
}

export interface PaidAsrOptions {
	provider: "whisper" | "gemini";
	apiKey?: string;
}
