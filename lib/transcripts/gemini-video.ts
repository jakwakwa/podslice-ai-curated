import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import { getYouTubeVideoDetails } from "@/lib/youtube";

// Point fluent-ffmpeg to the installed binary

// NOTE: When using a raw YouTube URL with Gemini video understanding models, the ENTIRE
// video is ingested unless you specify segment bounds via videoMetadata.startOffset
// and videoMetadata.endOffset on the Part. Simply adding an instruction with timestamps
// does NOT reduce input tokens (the model still tokenizes the whole video). This file
// implements true chunking by attaching videoMetadata to each request.

const PROMPT = `Transcribe this video (or segment) accurately. Output only raw transcript text without any extra commentary.`;

// Approximate token rates from Google docs (used for safe dynamic sizing decisions)
// Video: ~263 tokens/sec; Audio-only would be ~32 tokens/sec (not applicable here since we only pass URL)
const TOKENS_PER_VIDEO_SECOND = 263;

interface SegmentOptions {
	startOffset?: string; // e.g. "0s"
	endOffset?: string; // e.g. "300s"
}

// Helper constructing a Part with optional videoMetadata (not yet typed in SDK).
function buildYouTubeVideoPart(url: string, seg?: SegmentOptions): Part {
	const base = { fileData: { fileUri: url, mimeType: "video/*" } } as Part & {
		// Accept extra field for segmentation
		videoMetadata?: { startOffset?: string; endOffset?: string };
	};
	if (seg?.startOffset || seg?.endOffset) {
		base.videoMetadata = {};
		if (seg.startOffset) base.videoMetadata.startOffset = seg.startOffset;
		if (seg.endOffset) base.videoMetadata.endOffset = seg.endOffset;
	}
	return base as Part;
}

export async function transcribeWithGeminiFromUrl(url: string, seg?: SegmentOptions): Promise<string | null> {
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
	if (!apiKey) {
		throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
	}

	try {
		const modelName = process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-1.5-flash";

		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: modelName });

		const mediaPart = buildYouTubeVideoPart(url, seg);
		const result = await model.generateContent([mediaPart, PROMPT]);

		return result.response.text();
	} catch (error) {
		console.error("[GEMINI][youtube-url] Error:", error);
		throw error;
	}
}

// Legacy formatting helpers removed; we rely on second-based offsets only.

export interface ChunkOptions {
	chunkSeconds?: number; // target size (default 600 = 10 min)
	overlapSeconds?: number; // default 0
	maxTokensPerChunk?: number; // safety soft cap (default 180_000 < 1,048,576 limit)
	minChunkSeconds?: number; // floor when shrinking (default 60)
}

export async function transcribeWithGeminiFromUrlChunked(url: string, options?: ChunkOptions): Promise<string | null> {
	// Strategy overview:
	// - We rely on Gemini videoMetadata segmentation (startOffset/endOffset) so only the specified
	//   temporal window is ingested each request (unlike pure instruction-based timestamp prompts).
	// - We adapt chunk size downward if estimated tokens (seconds * 263) exceed a conservative soft cap.
	// - Requests are executed sequentially to respect RPM/TPM limits for typical tiers; caller can
	//   parallelize externally if quotas allow.
	// - No overlap by default; enable overlapSeconds>0 if you need to mitigate possible boundary truncation.
	// - If the video duration is shorter than target chunk length we fall back to a single call.
	// - Returns a concatenated transcript string or null if no text produced.
	// - NOTE: If you hit rate limits, consider introducing an artificial delay between iterations.
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
	if (!apiKey) {
		throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
	}

	const modelName = process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-1.5-flash";
	let targetChunkSeconds = Math.max(60, options?.chunkSeconds ?? 600);
	const overlapSeconds = Math.max(0, options?.overlapSeconds ?? 0);
	const maxTokensPerChunk = options?.maxTokensPerChunk ?? 180_000; // very conservative
	const minChunkSeconds = Math.max(30, options?.minChunkSeconds ?? 60);

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: modelName });

	const videoDetails = await getYouTubeVideoDetails(url);
	const durationSeconds = videoDetails?.duration;

	if (!durationSeconds || durationSeconds <= 0) {
		return await transcribeWithGeminiFromUrl(url);
	}

	if (durationSeconds <= targetChunkSeconds) {
		return await transcribeWithGeminiFromUrl(url);
	}

	// Adapt chunk size downward if estimated tokens are too high.
	// We keep a safety buffer well below the 1,048,576 hard cap.
	function estTokens(sec: number): number {
		return Math.round(sec * TOKENS_PER_VIDEO_SECOND);
	}
	while (estTokens(targetChunkSeconds) > maxTokensPerChunk && targetChunkSeconds > minChunkSeconds) {
		targetChunkSeconds = Math.max(minChunkSeconds, Math.floor(targetChunkSeconds / 2));
	}

	const segments: Array<{ start: number; end: number }> = [];
	let start = 0;
	while (start < durationSeconds) {
		const end = Math.min(durationSeconds, start + targetChunkSeconds);
		segments.push({ start: Math.max(0, start - (segments.length > 0 ? overlapSeconds : 0)), end });
		start = end;
	}

	const transcripts: string[] = [];
	for (const seg of segments) {
		const startOffset = `${Math.floor(seg.start)}s`;
		const endOffset = `${Math.floor(seg.end)}s`;
		const part = buildYouTubeVideoPart(url, { startOffset, endOffset });
		const instruction = `Transcribe ONLY between ${startOffset} and ${endOffset}. Plain text.`;
		const result = await model.generateContent([part, instruction]);
		const transcript = result.response.text();
		if (transcript) {
			transcripts.push(transcript);
		}
	}

	return transcripts.join("\n\n");
}
