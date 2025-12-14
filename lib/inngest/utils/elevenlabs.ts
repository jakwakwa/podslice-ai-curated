import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let _client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
	if (!_client) {
		const apiKey = process.env.ELEVENLABS_API_KEY;
		if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
		_client = new ElevenLabsClient({ apiKey });
	}
	return _client;
}

/**
 * Generates audio using ElevenLabs "Flash" model (low latency, cost effective)
 * serving as a backup for Gemini TTS.
 *
 * Uses voice: Adam (pNInz6obpgDQGcFmaJgB)
 * Model: eleven_flash_v2_5
 */
export async function generateElevenLabsTts(text: string): Promise<Buffer> {
	const client = getClient();

	// Using "Adam" voice ID hardcoded for now as a generic narrator,
	// or we could allow passing it in if needed.
	// const voiceId = "pNInz6obpgDQGcFmaJgB";
	// Actually, let's use a widely compatible one or the one from the prompt.
	// The prompt used pNInz6obpgDQGcFmaJgB (Adam).
	const voiceId = "pNInz6obpgDQGcFmaJgB";

	const audioStream = await client.textToSpeech.convert(voiceId, {
		modelId: "eleven_flash_v2_5",
		text,
		outputFormat: "mp3_44100_128",
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
