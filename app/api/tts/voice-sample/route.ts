import { NextResponse } from "next/server";
import { VOICE_NAMES, VOICE_OPTIONS } from "@/lib/constants/voices";
import { generateTtsAudio } from "@/lib/inngest/utils/genai";

interface WavConversionOptions {
	numChannels: number;
	sampleRate: number;
	bitsPerSample: number;
}

function parseMimeType(mimeType: string) {
	const [fileType, ...params] = mimeType.split(";").map(s => s.trim());
	const [, format] = fileType.split("/");
	const options: Partial<WavConversionOptions> = { numChannels: 1 };
	if (format?.startsWith("L")) {
		const bits = parseInt(format.slice(1), 10);
		if (!Number.isNaN(bits)) options.bitsPerSample = bits;
	}
	for (const param of params) {
		const [key, value] = param.split("=").map(s => s.trim());
		if (key === "rate") options.sampleRate = parseInt(value, 10);
	}
	return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions) {
	const { numChannels, sampleRate, bitsPerSample } = options;
	const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
	const blockAlign = (numChannels * bitsPerSample) / 8;
	const buffer = Buffer.alloc(44);
	buffer.write("RIFF", 0);
	buffer.writeUInt32LE(36 + dataLength, 4);
	buffer.write("WAVE", 8);
	buffer.write("fmt ", 12);
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20);
	buffer.writeUInt16LE(numChannels, 22);
	buffer.writeUInt32LE(sampleRate, 24);
	buffer.writeUInt32LE(byteRate, 28);
	buffer.writeUInt16LE(blockAlign, 32);
	buffer.writeUInt16LE(bitsPerSample, 34);
	buffer.write("data", 36);
	buffer.writeUInt32LE(dataLength, 40);
	return buffer;
}

function _convertToWav(rawBase64: string, mimeType: string) {
	const options = parseMimeType(mimeType);
	const pcm = Buffer.from(rawBase64, "base64");
	const header = createWavHeader(pcm.length, options);
	return Buffer.concat([header, pcm]);
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const voice = searchParams.get("voice") || "";
		if (!VOICE_NAMES.includes(voice)) {
			return new NextResponse("Invalid voice", { status: 400 });
		}

		const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
		if (!apiKey) return new NextResponse("Missing API key", { status: 500 });

		const sampleText = VOICE_OPTIONS.find(v => v.name === voice)?.sample || "This is a quick voice sample for your episode.";

		// Generate TTS audio (returns raw PCM data)
		const pcmBuffer = await generateTtsAudio(sampleText, { voiceName: voice });

		// Add WAV header to convert PCM to WAV format
		// Google's TTS API returns 24kHz, mono, 16-bit PCM by default
		const wavOptions: WavConversionOptions = {
			numChannels: 1,
			sampleRate: 24000,
			bitsPerSample: 16,
		};
		const wavHeader = createWavHeader(pcmBuffer.length, wavOptions);
		const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

		return new NextResponse(new Uint8Array(wavBuffer), {
			headers: {
				"Content-Type": "audio/wav",
				"Cache-Control": "public, max-age=86400",
			},
		});
	} catch (error) {
		console.error("[VOICE_SAMPLE_API]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
