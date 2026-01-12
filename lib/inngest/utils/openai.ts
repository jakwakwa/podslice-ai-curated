const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface GenerateTextWithOpenAIOptions {
	model?: string;
	temperature?: number;
	maxTokens?: number;
}

/**
 * Generate text using OpenAI's Chat Completions API.
 * Uses gpt-4o-mini as the default affordable model.
 */
export async function generateTextWithOpenAI(
	prompt: string,
	options?: GenerateTextWithOpenAIOptions
): Promise<string> {
	const apiKey =
		process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI;
	if (!apiKey) {
		throw new Error(
			"OpenAI API key missing. Set OPENAI_API_KEY, OPENAI_KEY, or OPENAI environment variable."
		);
	}

	const model = options?.model || "gpt-4o-mini";
	const temperature = options?.temperature ?? 0.7;
	const maxTokens = options?.maxTokens;

	const payload = {
		model,
		messages: [{ role: "user", content: prompt }],
		temperature,
		...(maxTokens ? { max_tokens: maxTokens } : {}),
	};

	const response = await fetch(OPENAI_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
	}

	const json = await response.json();
	const content = json?.choices?.[0]?.message?.content?.trim();

	if (!content) {
		throw new Error("OpenAI API returned empty response");
	}

	return content;
}

/**
 * Generate an objective summary using OpenAI (fallback for Gemini).
 * Handles chunking for large transcripts similar to generateObjectiveSummary.
 */
export async function generateObjectiveSummaryWithOpenAI(
	transcript: string
): Promise<string> {
	const maxChunkCharsEnv = Number(process.env.SUMMARY_CHUNK_CHAR_LIMIT || 18000);
	const maxChunksEnv = Number(process.env.SUMMARY_MAX_CHUNKS || 6);
	const maxChunkChars =
		Number.isFinite(maxChunkCharsEnv) && maxChunkCharsEnv > 2000
			? maxChunkCharsEnv
			: 18000;
	const maxChunks = Number.isFinite(maxChunksEnv) && maxChunksEnv > 0 ? maxChunksEnv : 6;

	const baseFinalPrompt = (body: string) =>
		`Task: Produce a faithful, objective summary of this content's key ideas.\n\nConstraints:\n- Do NOT imitate the original speakers or style.\n- Do NOT write a script or dialogue.\n- No stage directions, no timestamps.\n- Focus on core concepts, arguments, evidence, and takeaways.\n\nFormat:\n1) 5–10 bullet points of key highlights (short, punchy).\n2) A 4–5 sentence narrative recap synthesizing the big picture.\n\n${body}`;

	// Fast path – small transcript, single call
	if (transcript.length <= maxChunkChars) {
		return generateTextWithOpenAI(baseFinalPrompt(`Transcript:\n${transcript}`), {
			temperature: 0.3,
		});
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
		const summary = await generateTextWithOpenAI(chunkPrompt, {
			temperature: 0.3,
		});
		partialSummaries.push(summary.trim());
	}

	// Second pass: consolidate all bullet summaries into final required format.
	const consolidatedBullets = partialSummaries.join("\n");
	const finalPrompt = baseFinalPrompt(
		`Here are bullet point extracts from segmented transcript pieces (deduplicate & merge conceptually related items):\n\n${consolidatedBullets}`
	);
	return generateTextWithOpenAI(finalPrompt, {
		temperature: 0.3,
	});
}
