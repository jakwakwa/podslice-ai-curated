import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
	if (!client) {
		const apiKey = process.env.ELEVENLABS_API_KEY;
		if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
		client = new ElevenLabsClient({ apiKey });
	}
	return client;
}

/**
 * Generates audio using ElevenLabs "Flash" model (low latency, cost effective)
 * serving as a backup for Gemini TTS.
 *
 * Uses voice: Adam (pNInz6obpgDQGcFmaJgB)
 * Model: eleven_flash_v2_5
 * Output: Raw PCM 24kHz (compatible with Gemini TTS chunks)
 */
export async function generateElevenLabsTts(text: string): Promise<Buffer> {
	const client = getClient();

	const voiceId = "pNInz6obpgDQGcFmaJgB";

	const audioStream = await client.textToSpeech.convert(voiceId, {
		modelId: "eleven_flash_v2_5",
		text,
		outputFormat: "pcm_24000",
	});

	const chunks: Uint8Array[] = [];
	const reader = audioStream.getReader();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
}
