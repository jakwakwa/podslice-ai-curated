// Shared Gemini client + helpers (migrated to @google/genai)
import { GoogleGenAI, type Part } from "@google/genai";
export type { Part };

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
	if (!_client) {
		const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
		if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
		_client = new GoogleGenAI({ apiKey });
	}
	return _client;
}

export interface GenerateOptions {
	tools?: Array<{ googleSearch?: {} }>;
	systemInstruction?: string;
}

export async function generateText(
	model: string,
	prompt: string | Part[],
	opts?: GenerateOptions
): Promise<string> {
	const client = getClient();
	const contents =
		typeof prompt === "string"
			? [{ role: "user", parts: [{ text: prompt }] }]
			: [{ role: "user", parts: prompt }];

	const result = await client.models.generateContent({
		model,
		contents,
		config: {
			tools: opts?.tools,
			systemInstruction: opts?.systemInstruction,
		},
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

export async function generateTtsAudio(
	text: string,
	opts?: AudioGenerateOptions
): Promise<Buffer> {
	const client = getClient();
	const model =
		opts?.model || process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
	const voiceName = opts?.voiceName || process.env.GEMINI_TTS_VOICE || "Orus";

	const response = await client.models.generateContentStream({
		model,

		config: {
			temperature: 1.1,
			responseModalities: ["audio"],
			speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
		},
		contents: [{ role: "user", parts: [{ text }] }],
	});
	let audio: Buffer | null = null;
	for await (const chunk of response) {
		const inlineData = chunk.candidates?.[0]?.content?.parts?.find(
			(p: { inlineData?: { data?: string } }) => p.inlineData
		)?.inlineData;
		if (inlineData?.data) audio = Buffer.from(inlineData.data, "base64");
	}
	if (!audio) throw new Error("No audio produced");
	return audio;
}

export function extractTextFromResponse(response: {
	candidates?: Array<{ content: { parts: Array<{ text?: string }> } }>;
}): string {
	return (
		response?.candidates?.[0]?.content?.parts
			?.map((p: { text?: string }) => p.text)
			.filter(Boolean)
			.join(" ")
			?.trim() || ""
	);
}

export { getClient as getGenAIClient };

export async function generateJSON(
	model: string,
	prompt: string | Part[],
	schema?: any,
	opts?: GenerateOptions
): Promise<any> {
	const client = getClient();
	const generationConfig: any = {
		responseMimeType: "application/json",
		tools: opts?.tools,
		systemInstruction: opts?.systemInstruction,
	};

	if (schema) {
		generationConfig.responseSchema = schema;
	}

	const contents =
		typeof prompt === "string"
			? [{ role: "user", parts: [{ text: prompt }] }]
			: [{ role: "user", parts: prompt }];

	const result = await client.models.generateContent({
		model,
		contents,
		config: generationConfig,
	});

	const responseText =
		result.candidates?.[0]?.content?.parts
			?.map((p: { text?: string }) => p.text)
			.filter(Boolean)
			.join(" ")
			?.trim() || "{}";

	try {
		return JSON.parse(responseText);
	} catch (_e) {
		console.error("Failed to parse JSON response from Gemini", responseText);
		throw new Error("Failed to parse JSON response");
	}
}
