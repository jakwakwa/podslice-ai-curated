// Shared helper utilities for both user and admin episode generation workflows.
// Keep this file minimal and pure (no DB access) to allow reuse across Inngest functions.
import { aiConfig } from "@/config/ai";
import { extractAudioDuration } from "@/lib/inngest/utils/audio-metadata";
import { ensureBucketName, getStorageUploader } from "@/lib/inngest/utils/gcs";
import { generateTtsAudio } from "@/lib/inngest/utils/genai";

const DEFAULT_TTS_CHUNK_WORDS = 120;

export function getTtsChunkWordLimit(): number {
	const raw = process.env.TTS_CHUNK_WORDS;
	if (!raw) return DEFAULT_TTS_CHUNK_WORDS;
	const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, "");
	const parsed = Number.parseInt(cleaned, 10);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}
	return DEFAULT_TTS_CHUNK_WORDS;
}

export interface WavConversionOptions {
	numChannels: number;
	sampleRate: number;
	bitsPerSample: number;
}

// Upload a buffer to the primary bucket; returns a gs:// URI
export async function uploadBufferToPrimaryBucket(
	data: Buffer,
	destinationFileName: string
): Promise<string> {
	const uploader = getStorageUploader();
	const bucketName = ensureBucketName();
	const [exists] = await uploader.bucket(bucketName).exists();
	if (!exists) throw new Error(`Bucket ${bucketName} does not exist`);
	await uploader.bucket(bucketName).file(destinationFileName).save(data);
	return `gs://${bucketName}/${destinationFileName}`;
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

function isWav(buffer: Buffer): boolean {
	return (
		buffer.length >= 12 &&
		buffer.toString("ascii", 0, 4) === "RIFF" &&
		buffer.toString("ascii", 8, 12) === "WAVE"
	);
}

function extractWavOptions(buffer: Buffer): WavConversionOptions {
	const numChannels = buffer.readUInt16LE(22);
	const sampleRate = buffer.readUInt32LE(24);
	const bitsPerSample = buffer.readUInt16LE(34);
	return { numChannels, sampleRate, bitsPerSample };
}

function getPcmData(buffer: Buffer): Buffer {
	return buffer.subarray(44);
}

export function concatenateWavs(buffers: Buffer[]): Buffer {
	if (buffers.length === 0) throw new Error("No buffers to concatenate");
	const first = buffers[0]!;
	if (!isWav(first)) throw new Error("First buffer is not a WAV file");
	const options = extractWavOptions(first);
	const pcmParts = buffers.map(buf => (isWav(buf) ? getPcmData(buf) : buf));
	const totalPcmLength = pcmParts.reduce((acc, b) => acc + b.length, 0);
	const header = createWavHeader(totalPcmLength, options);
	return Buffer.concat([header, ...pcmParts]);
}

export function splitScriptIntoChunks(text: string, approxWordsPerChunk = 130): string[] {
	const safeChunkSize =
		Number.isFinite(approxWordsPerChunk) && approxWordsPerChunk > 0
			? Math.floor(approxWordsPerChunk)
			: DEFAULT_TTS_CHUNK_WORDS;
	const words = text.split(/\s+/).filter(Boolean);
	const chunks: string[] = [];
	let current: string[] = [];
	for (const w of words) {
		current.push(w);
		if (current.length >= safeChunkSize) {
			chunks.push(current.join(" "));
			current = [];
		}
	}
	if (current.length) chunks.push(current.join(" "));
	return chunks;
}

export function combineAndUploadWavChunks(
	base64Chunks: string[],
	destinationFileName: string
): { finalBuffer: Buffer; durationSeconds: number; destinationFileName: string } {
	// If first chunk already looks like a WAV (after decoding), assume all are WAV fragments.
	// Otherwise treat them as raw Linear PCM (Gemini TTS returns raw audio bytes w/out RIFF header).
	if (base64Chunks.length === 0) throw new Error("No audio chunks provided");
	const buffers = base64Chunks.map(b64 => Buffer.from(b64, "base64"));

	let finalWav: Buffer;
	let durationSeconds = 0;
	const first = buffers[0]!;
	if (isWav(first)) {
		finalWav = concatenateWavs(buffers);
		const durationSecondsRaw = extractAudioDuration(finalWav, "audio/wav");
		durationSeconds =
			typeof durationSecondsRaw === "number" && !Number.isNaN(durationSecondsRaw)
				? durationSecondsRaw
				: 0;
		return { finalBuffer: finalWav, durationSeconds, destinationFileName };
	}

	// Raw PCM path
	const rawMime = process.env.TTS_RAW_MIME_TYPE || "audio/L16; rate=24000"; // default guess (24kHz linear16)
	const { sampleRate, bitsPerSample } = (() => {
		try {
			const [type, ...params] = rawMime.split(";").map(s => s.trim());
			const [, fmt] = type!.split("/");
			let sr: number | undefined;
			let bps: number | undefined;
			if (fmt?.startsWith("L")) {
				const bits = parseInt(fmt.slice(1), 10);
				if (!Number.isNaN(bits)) bps = bits;
			}
			for (const p of params) {
				const [k, v] = p.split("=").map(s => s.trim());
				if (k === "rate") {
					const parsed = parseInt(v!, 10);
					if (!Number.isNaN(parsed)) sr = parsed;
				}
			}
			return { sampleRate: sr || 24000, bitsPerSample: bps || 16 };
		} catch {
			return { sampleRate: 24000, bitsPerSample: 16 };
		}
	})();
	const numChannels = 1;
	const totalPcmLength = buffers.reduce((acc, b) => acc + b.length, 0);
	const header = createWavHeader(totalPcmLength, {
		numChannels,
		sampleRate,
		bitsPerSample,
	});
	finalWav = Buffer.concat([header, ...buffers]);
	const bytesPerSample = bitsPerSample / 8;
	const totalSamples = totalPcmLength / (bytesPerSample * numChannels);
	durationSeconds = totalSamples / sampleRate;
	return { finalBuffer: finalWav, durationSeconds, destinationFileName };
}

// Single-speaker audio generation (Gemini TTS) with truncation logic.
export async function generateSingleSpeakerTts(script: string): Promise<Buffer> {
	const maxLength = aiConfig.useShortEpisodes ? 1000 : 4000;
	const episodeType = aiConfig.useShortEpisodes ? "1-minute" : "3-minute";
	if (script.length > maxLength) {
		console.log(
			`⚠️ Script too long for ${episodeType} episode (${script.length} chars), truncating to ${maxLength} chars`
		);
		script = `${script.substring(0, maxLength)}...`;
	}
	return generateTtsAudio(
		`Please read the following podcast script aloud in a clear, engaging style. Read only the spoken words - ignore any sound effects, stage directions, or non-spoken elements:\n\n${script}`
	);
}

export type JsonBuffer = { type: "Buffer"; data: number[] };
export function isJsonBuffer(value: unknown): value is JsonBuffer {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { type?: unknown }).type === "Buffer" &&
		Array.isArray((value as { data?: unknown }).data)
	);
}
export function ensureNodeBuffer(value: unknown): Buffer {
	if (Buffer.isBuffer(value)) return value;
	if (isJsonBuffer(value)) return Buffer.from(value.data);
	throw new Error("Invalid audio buffer returned from TTS step");
}

export function sanitizeSpeakerLabels(input: string): string {
	let cleaned = input
		.replace(/^\s*(?:HOST\s*SLICE|PODSLICE\s*GUEST|HOST|GUEST|A|B)\s*[:\-–]\s*/i, "")
		.trim();
	// Remove inline references like "A.", "B.", etc.
	cleaned = cleaned
		.replace(/\b(?:HOST\s*SLICE|PODSLICE\s*GUEST|HOST|GUEST|A|B)\.(?=\s|$)/gi, "")
		.trim();
	return cleaned;
}
