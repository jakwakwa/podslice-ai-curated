import { generateText } from "@/lib/inngest/utils/genai";

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

// ─────────────────────────────────────────────────────────────────────────────
// B2B FINANCIAL INTELLIGENCE SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export interface TradeRecommendation {
	direction: "LONG" | "SHORT" | "HOLD" | "AVOID";
	ticker: string;
	conviction: "HIGH" | "MEDIUM" | "LOW";
	rationale: string; // One sentence explaining why
	timeHorizon?: string; // e.g., "3-6 months", "Near-term catalyst"
}

export interface RiskFlag {
	severity: "HIGH" | "MEDIUM" | "LOW";
	category: string; // e.g., "Regulatory", "Execution", "Macro", "Valuation"
	description: string;
}

export interface DocumentContradiction {
	claim: string; // What the speaker claimed
	groundTruth: string; // What the reference doc says
	severity: "CRITICAL" | "NOTABLE" | "MINOR";
}

export interface FinancialResponse {
	structuredData: {
		sentimentScore: number; // -1.0 to 1.0
		sentimentLabel: "BULLISH" | "NEUTRAL" | "BEARISH";
		tickers: string[];
		sectorRotation: string | null; // null if not applicable
	};
	writtenContent: {
		executiveBrief: string; // 3 sentences max - the asymmetric bet
		variantView: string | null; // How this differs from consensus; null if no clear variant
		investmentImplications: string; // Markdown - specific insights
		risksAndRedFlags: string; // Markdown - explicit section, or "Not applicable to source input"
		tradeRecommendations: TradeRecommendation[]; // Can be empty array
		documentContradictions: DocumentContradiction[]; // Only populated if reference doc provided
	};
	audioScript: string; // Contrarian briefing for PM
}

export async function generateFinancialAnalysis(
	transcript: string,
	referenceDocContent?: string
): Promise<FinancialResponse> {
	const modelName = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";

	const hasReferenceDoc = !!referenceDocContent;

	const systemPrompt = `Role: You are a Senior Investment Analyst at a multi-strategy hedge fund.
Target Audience: Boutique investment firms, crypto professionals, equity researchers, and advanced individual investors who pay $50-100/month for actionable intelligence—not summaries.

MISSION:
Extract ACTIONABLE SIGNALS from audio content. Your users don't have time to listen but need the insights.
This is NOT a summary service. You provide:
1. Ticker extraction with sentiment
2. Risk identification (Lie Detector)
3. Trade recommendations with conviction levels
4. Variant views (non-consensus angles)
${hasReferenceDoc ? "5. Contradiction flagging against the provided reference document" : ""}

RULES FOR CONDITIONAL SECTIONS:
- ALWAYS evaluate each section honestly. If something is NOT relevant, explicitly state it.
- For "risksAndRedFlags": If no risks found, write "Not applicable to source input. No material risks, exaggerations, or red flags identified."
- For "variantView": If the speaker's view aligns with consensus, return null.
- For "sectorRotation": If no capital flow pattern is discussed, return null.
- For "tradeRecommendations": If no actionable trades emerge, return empty array [].
${hasReferenceDoc ? '- For "documentContradictions": Flag any discrepancies between speaker claims and reference doc. If none, return empty array [].' : '- For "documentContradictions": Return empty array [] (no reference document provided).'}

BE UNBIASED AND FACT-DRIVEN:
- Do NOT inflate importance or add fluff
- Do NOT invent insights that aren't grounded in the source
- State when information is speculative vs. stated as fact
- Your credibility depends on accuracy, not volume

OUTPUT JSON SCHEMA:
{
  "structuredData": {
    "sentimentScore": float (-1.0 extreme fear to 1.0 extreme greed),
    "sentimentLabel": "BULLISH" | "NEUTRAL" | "BEARISH",
    "tickers": string[] (all mentioned assets, prefixed with $, e.g. ["$BTC", "$NVDA"]),
    "sectorRotation": string | null (e.g., "Rotation: Software → Energy Infrastructure" or null if not discussed)
  },
  "writtenContent": {
    "executiveBrief": string (3 sentences max. The asymmetric insight. Markdown OK.),
    "variantView": string | null (How this differs from WSJ/Bloomberg consensus. null if no clear variant.),
    "investmentImplications": string (Markdown. Second-order effects and strategic positioning.),
    "risksAndRedFlags": string (Markdown. Explicit risks, exaggerations, or hype identified. If none: "Not applicable to source input. No material risks identified."),
    "tradeRecommendations": [
      {
        "direction": "LONG" | "SHORT" | "HOLD" | "AVOID",
        "ticker": "$TICKER",
        "conviction": "HIGH" | "MEDIUM" | "LOW",
        "rationale": "One sentence why",
        "timeHorizon": "e.g., 3-6 months (optional)"
      }
    ],
    "documentContradictions": [
      {
        "claim": "What the speaker claimed",
        "groundTruth": "What the reference document states",
        "severity": "CRITICAL" | "NOTABLE" | "MINOR"
      }
    ]
  },
  "audioScript": string (A 2-minute briefing for a Portfolio Manager.
   - Tone: Professional, direct, no fluff. Not cynical or sensational.
   - Style: 'The key signal from this content is X. Here's why it matters for positioning.'
   - Structure: Lead with the insight, then context, then implications.
   - Constraint: 800-1200 words. Full paragraphs, not bullets.
   - NEVER echo the original transcript. Synthesize your own analysis.
   - DO NOT include "Host:" or "Speaker:" prefixes.)
}`;

	const userContent = `TRANSCRIPT:
${transcript.slice(0, 50000)}

${hasReferenceDoc ? `REFERENCE DOCUMENT (GROUND TRUTH - use for contradiction detection):\n${referenceDocContent}` : "NO REFERENCE DOCUMENT PROVIDED - return empty documentContradictions array."}`;

	const prompt = `${systemPrompt}\n\n${userContent}`;

	// We use the generateJSON helper
	const { generateJSON } = await import("@/lib/inngest/utils/genai");
	const response = await generateJSON(modelName, prompt);

	return response as FinancialResponse;
}
