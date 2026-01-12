// Shared helper utilities for both user and admin episode generation workflows.
// Keep this file minimal and pure (no DB access) to allow reuse across Inngest functions.

import { MPEGDecoder } from "mpg123-decoder";
import { aiConfig } from "@/config/ai";
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

function isMp3(buffer: Buffer): boolean {
	// Simple MP3 detection: check for ID3 tag or sync word (0xFFE0)
	if (buffer.length < 3) return false;
	if (buffer.toString("ascii", 0, 3) === "ID3") return true;
	if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1]! & 0xe0) === 0xe0)
		return true;
	return false;
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

// Linear resampling from sourceRate to targetRate (mono)
function resamplePcm(
	input: Float32Array,
	sourceRate: number,
	targetRate: number
): Float32Array {
	if (sourceRate === targetRate) return input;
	const ratio = sourceRate / targetRate;
	const newLength = Math.round(input.length / ratio);
	const output = new Float32Array(newLength);

	for (let i = 0; i < newLength; i++) {
		const pos = i * ratio;
		const index = Math.floor(pos);
		const frac = pos - index;
		const val1 = input[index] || 0;
		const val2 = input[index + 1] || val1; // Clamping to end
		output[i] = val1 + (val2 - val1) * frac;
	}
	return output;
}

// Convert Float32Array (-1.0 to 1.0) to Int16 Buffer
function float32ToInt16Buffer(float32: Float32Array): Buffer {
	const int16 = new Int16Array(float32.length);
	for (let i = 0; i < float32.length; i++) {
		const s = Math.max(-1, Math.min(1, float32[i]!));
		int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
	}
	return Buffer.from(int16.buffer);
}

export async function combineAndUploadWavChunks(
	base64Chunks: string[],
	destinationFileName: string
): Promise<{
	finalBuffer: Buffer;
	durationSeconds: number;
	destinationFileName: string;
}> {
	if (base64Chunks.length === 0) throw new Error("No audio chunks provided");

	// Default to Gemini (24kHz, 16-bit Mono)
	const targetSampleRate = 24000;
	const targetChannels = 1;
	const targetBits = 16;

	const buffers = base64Chunks.map(b64 => Buffer.from(b64, "base64"));
	const pcmParts: Buffer[] = [];

	// Decoder instance for MP3
	const decoder = new MPEGDecoder();
	await decoder.ready;

	try {
		for (const buf of buffers) {
			if (isWav(buf)) {
				// Existing WAV handling (unlikely for Gemini/ElevenLabs mix, but robust)
				const opts = extractWavOptions(buf);
				if (opts.sampleRate !== targetSampleRate) {
					// TODO: Add wav resampling if needed, for now assuming matching or raw PCM
					console.warn(
						`[COMBINE] WAV sample rate mismatch: ${opts.sampleRate} vs ${targetSampleRate}`
					);
				}
				pcmParts.push(getPcmData(buf));
			} else if (isMp3(buf)) {
				// Decode MP3 to PCM -> Resample to 24kHz
				const { channelData, sampleRate } = decoder.decode(buf);
				const leftChannel = channelData[0]; // Float32Array
				if (!leftChannel) throw new Error("MP3 decode failed: no channel data");

				const resampled = resamplePcm(leftChannel, sampleRate, targetSampleRate);
				pcmParts.push(float32ToInt16Buffer(resampled));
			} else {
				// Assume raw PCM (Gemini) - 24kHz 16-bit Mono
				pcmParts.push(buf);
			}
		}
	} finally {
		decoder.free();
	}

	const totalPcmLength = pcmParts.reduce((acc, b) => acc + b.length, 0);
	const header = createWavHeader(totalPcmLength, {
		numChannels: targetChannels,
		sampleRate: targetSampleRate,
		bitsPerSample: targetBits,
	});

	const finalWav = Buffer.concat([header, ...pcmParts]);
	const bytesPerSample = targetBits / 8;
	const totalSamples = totalPcmLength / (bytesPerSample * targetChannels);
	const durationSeconds = totalSamples / targetSampleRate;

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
