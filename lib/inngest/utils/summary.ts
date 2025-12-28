import { generateText } from "@/lib/inngest/utils/genai";
import type { UserEpisodeIntelligence } from "@/lib/types/intelligence";

/**
 * Generate an objective summary (bullets + narrative recap) for a potentially large transcript.
 * Large transcripts are chunked to stay under model token + rate limits. We keep the number of
 * model calls as low as possible by using the largest permissible chunk size and capping the
 * number of chunks via SUMMARY_MAX_CHUNKS (default 6).
 */
export async function generateObjectiveSummary(
	transcript: string,
	opts?: { modelName?: string }
): Promise<string> {
	const modelName =
		opts?.modelName || process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
	const maxChunkCharsEnv = Number(process.env.SUMMARY_CHUNK_CHAR_LIMIT || 18000); // rough ~6-7k tokens
	const maxChunksEnv = Number(process.env.SUMMARY_MAX_CHUNKS || 6);
	const maxChunkChars =
		Number.isFinite(maxChunkCharsEnv) && maxChunkCharsEnv > 2000
			? maxChunkCharsEnv
			: 18000;
	const maxChunks = Number.isFinite(maxChunksEnv) && maxChunksEnv > 0 ? maxChunksEnv : 6;

	const baseFinalPrompt = (body: string) =>
		`Task: Produce a faithful, objective summary of this content's key ideas.\n\nConstraints:\n- Do NOT imitate the original speakers or style.\n- Do NOT write a script or dialogue.\n- No stage directions, no timestamps.\n- Focus on core concepts, arguments, evidence, and takeaways.\n\nFormat:\n1) 5–10 bullet points of key highlights (short, punchy).\n2) A 4–5 sentence narrative recap synthesizing the big picture.\n\n${body}`;

	// Fast path – small transcript, single call (keeps legacy behavior)
	if (transcript.length <= maxChunkChars) {
		return generateText(modelName, baseFinalPrompt(`Transcript:\n${transcript}`));
	}

	// Compute dynamic chunk size so that we never exceed maxChunks.
	const neededChunks = Math.ceil(transcript.length / maxChunkChars);
	const effectiveChunks = Math.min(neededChunks, maxChunks);
	const dynamicChunkSize = Math.ceil(transcript.length / effectiveChunks);

	const chunks: string[] = [];
	for (let i = 0; i < transcript.length; i += dynamicChunkSize) {
		chunks.push(transcript.slice(i, i + dynamicChunkSize));
	}

	// First pass: summarize each chunk individually (sequential to avoid per‑minute quota spikes)
	const partialSummaries: string[] = [];
	for (let idx = 0; idx < chunks.length; idx++) {
		const c = chunks[idx];
		const chunkPrompt = `You will summarize segment ${idx + 1} of ${chunks.length} of a longer transcript.\nReturn ONLY 5-8 concise bullet points capturing unique, substantive ideas (no repetition, no meta commentary).\nNo intro text, just bullet points.\n\nSegment ${idx + 1}:\n${c}`;
		// We purposely reuse the same model for consistency.
		const summary = await generateText(modelName, chunkPrompt);
		partialSummaries.push(summary.trim());
	}

	// Second pass: consolidate all bullet summaries into final required format.
	const consolidatedBullets = partialSummaries.join("\n");
	const finalPrompt = baseFinalPrompt(
		`Here are bullet point extracts from segmented transcript pieces (deduplicate & merge conceptually related items):\n\n${consolidatedBullets}`
	);
	return generateText(modelName, finalPrompt);
}

export async function generateFinancialAnalysis(
	transcript: string,
	referenceDocContent?: string
): Promise<UserEpisodeIntelligence> {
	const modelName = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";

	const systemPrompt = `You are an Institutional Equity Research Analyst.
Your task is to analyze the provided transcript and extract structured financial intelligence.

INPUTS:
- Transcript
- Reference Document (Optional - treat as Ground Truth)

OUTPUT SCHEMA (JSON ONLY):
{
  "sentiment": "BULLISH" | "NEUTRAL" | "BEARISH",
  "sentimentScore": float (-1.0 to 1.0),
  "mentionedAssets": [
    {
      "ticker": string (e.g., "$BTC", "$NVDA"),
      "name": string,
      "relevanceScore": float (0.0 to 1.0)
    }
  ],
  "technical_contradictions": string[] (If reference doc provided, list contradictions)
}

RULES:
1. Tickers: Extract ALL valid crypto/stock tickers. Prefix with $.
2. Relevance: Score 1.0 if the asset is the main topic, 0.1 if mentioned in passing.
3. Sentiment: -1.0 is extreme panic, 1.0 is extreme greed.`;

	const userContent = `TRANSCRIPT:
${transcript.slice(0, 50000)} // Truncate to avoid context window issues just in case, though 2.0 flash should handle it.

${referenceDocContent ? `REFERENCE DOCUMENT (GROUND TRUTH):\n${referenceDocContent}` : ""}`;

	const prompt = `${systemPrompt}\n\n${userContent}`;

	// We use the generateJSON helper we just created
	const { generateJSON } = await import("@/lib/inngest/utils/genai");
	const response = await generateJSON(modelName, prompt);

	// Map raw JSON to our internal types forcefully to ensure safety
	return {
		sentiment: response.sentiment,
		sentimentScore: response.sentimentScore,
		mentionedAssets: response.mentionedAssets,
		technicalContradictions: response.technical_contradictions,
	};
}
