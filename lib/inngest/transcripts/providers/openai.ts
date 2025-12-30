import type { TranscriptProvider, TranscriptRequest, TranscriptResponse } from "../types";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export const OpenAITextFallbackProvider: TranscriptProvider = {
	name: "openai-text-fallback",
	canHandle() {
		// Always allow as a last-resort text extractor from HTML pages
		return true;
	},
	async getTranscript(request: TranscriptRequest): Promise<TranscriptResponse> {
		const apiKey =
			process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI;
		if (!apiKey) {
			return { success: false, error: "OpenAI API key missing", provider: this.name };
		}

		try {
			const res = await fetch(request.url, { headers: { "User-Agent": "Mozilla/5.0" } });
			const body = await res.text();

			// Ask OpenAI to extract any visible captions/transcript text from the HTML.
			const system = `You are a helper that extracts transcript or captions from an HTML page. Return only the transcript text, unescaped, or an empty string if none found.`;
			const user = `Extract any human-readable transcript, captions, or subtitle text from the following HTML page. If none found, return an empty string.\n\nHTML:\n${body.substring(0, 20000)}\n\nRespond with only the transcript text.`;

			const payload = {
				model: "gpt-4o-mini",
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: user },
				],
				max_tokens: 5000,
				temperature: 0,
			};

			const openai = await fetch(OPENAI_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(payload),
			});

			if (!openai.ok) {
				const text = await openai.text();
				return {
					success: false,
					error: `OpenAI error: ${openai.status} ${text}`,
					provider: this.name,
				};
			}

			const json = await openai.json();
			const content = (
				json?.choices?.[0]?.message?.content ||
				json?.choices?.[0]?.text ||
				""
			).trim();
			if (!content)
				return { success: false, error: "No transcript extracted", provider: this.name };

			return { success: true, transcript: content, provider: this.name };
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err),
				provider: this.name,
			};
		}
	},
};
