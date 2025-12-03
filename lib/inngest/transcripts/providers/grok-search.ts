import type { TranscriptProvider, TranscriptRequest, TranscriptResponse } from "../types";

const XAI_ENDPOINT = "https://api.x.ai/v1/generate";

export const GrokSearchProvider: TranscriptProvider = {
	name: "grok-search",
	canHandle() {
		return true; // discovery provider: always allowed
	},
	async getTranscript(request: TranscriptRequest): Promise<TranscriptResponse> {
		const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
		if (!apiKey)
			return { success: false, error: "Grok API key missing", provider: this.name };

		try {
			const payload = {
				model: "grok-3-latest",
				prompt: `Search for any transcript, captions, or RSS feed content for this URL: ${request.url}`,
				providerOptions: {
					xai: {
						searchParameters: {
							mode: "on",
							returnCitations: true,
							maxSearchResults: 8,
							sources: [
								{ type: "web" },
								{ type: "news" },
								{ type: "rss", links: [request.url] },
							],
						},
					},
				},
			};

			const res = await fetch(XAI_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const text = await res.text();
				return {
					success: false,
					error: `Grok error: ${res.status} ${text}`,
					provider: this.name,
				};
			}

			const json = await res.json();
			const text = json?.text || json?.output || "";
			if (!text || text.trim().length < 20) {
				// Try to extract any cited link as nextUrl
				const citations = json?.citations || json?.sources || [];
				const nextUrl = citations?.[0]?.link || null;
				return {
					success: false,
					error: "No transcript found",
					provider: this.name,
					meta: nextUrl ? { nextUrl } : undefined,
				};
			}

			return {
				success: true,
				transcript: String(text).trim(),
				provider: this.name,
				meta: { raw: json },
			};
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : String(err),
				provider: this.name,
			};
		}
	},
};
