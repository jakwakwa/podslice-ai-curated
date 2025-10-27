// Shared Gemini client + helpers (migrated to @google/genai)
import { GoogleGenAI } from "@google/genai";
import { templateLiteral } from "zod/v4";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
	if (!_client) {
		const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
		if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
		_client = new GoogleGenAI({ apiKey });
	}
	return _client;
}

export async function generateText(model: string, prompt: string): Promise<string> {
	const client = getClient();
	const result = await client.models.generateContent({
		model,
		contents: [{ role: "user", parts: [{ text: prompt }] }],
	});
	return (
		result.candidates?.[0]?.content?.parts
			?.map((p: { text?: string }) => p.text)
			.filter(Boolean)
			.join(" ")
			?.trim() ?? ""
	);
}

export interface AudioGenerateOptions {
	voiceName?: string;
	temperature?: number;
	model?: string;
}

export async function generateTtsAudio(text: string, opts?: AudioGenerateOptions): Promise<Buffer> {
	const client = getClient();
	const model = opts?.model || process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
	const voiceName = opts?.voiceName || process.env.GEMINI_TTS_VOICE || "Sulafat";

	const response = await client.models.generateContentStream({
		model,
		
		config: { temperature: 1.15, responseModalities: ["audio"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
		contents: [{ role: "user", parts: [{ text }] }],
	});
	let audio: Buffer | null = null;
	for await (const chunk of response) {
		const inlineData = chunk.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data?: string } }) => p.inlineData)?.inlineData;
		if (inlineData?.data) audio = Buffer.from(inlineData.data, "base64");
	}
	if (!audio) throw new Error("No audio produced");
	return audio;
}

export function extractTextFromResponse(response: { candidates?: Array<{ content: { parts: Array<{ text?: string }> } }> }): string {
	return (
		response?.candidates?.[0]?.content?.parts
			?.map((p: { text?: string }) => p.text)
			.filter(Boolean)
			.join(" ")
			?.trim() || ""
	);
}

export { getClient as getGenAIClient };
