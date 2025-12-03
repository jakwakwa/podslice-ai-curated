// Migrated from @google/generative-ai to @google/genai per Google Gemini API migration guide
import { GoogleGenAI, type Part } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

const InputSchema = z.object({
	url: z.string().url(),
	sentences: z.number().min(1).max(10).optional(),
});

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = InputSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.message }, { status: 400 });
		}

		const { url, sentences } = parsed.data;

		const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
		if (!apiKey) {
			return NextResponse.json(
				{ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set" },
				{ status: 500 }
			);
		}

		const modelName =
			process.env.GEMINI_SUMMARY_MODEL ||
			process.env.GEMINI_TRANSCRIBE_MODEL ||
			"gemini-2.5-pro";
		const genAI = new GoogleGenAI({ apiKey });
		const instruction = `Please summarize the video in ${sentences ?? 3} sentences.`;
		const mediaPart: Part = { fileData: { fileUri: url, mimeType: "video/*" } };
		// New SDK uses models.generateContent
		const result = await genAI.models.generateContent({
			model: modelName,
			contents: [{ role: "user", parts: [mediaPart, { text: instruction }] }],
		});
		// Aggregate text segments safely
		const text =
			result.candidates
				?.map(c =>
					c.content?.parts
						?.map(p => ("text" in p ? p.text : ""))
						.filter(Boolean)
						.join(" ")
				)
				.filter(Boolean)
				.join("\n")
				.trim() || "";

		return NextResponse.json({ summary: text });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
