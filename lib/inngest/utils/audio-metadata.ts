/**
 * Simple audio metadata extraction for generated podcast episodes
 * Focuses only on getting duration from actual audio files stored in GCS
 */

/**
 * Extract duration from audio buffer
 * This is a simple implementation that works with WAV files
 */
function extractWavDuration(audioBuffer: Buffer): number | null {
	try {
		// WAV file format: Check for 'RIFF' header
		if (audioBuffer.length < 44 || audioBuffer.toString("ascii", 0, 4) !== "RIFF") {
			return null;
		}

		// Extract sample rate (bytes 24-27)
		const sampleRate = audioBuffer.readUInt32LE(24);

		// Extract byte rate (bytes 28-31)
		const byteRate = audioBuffer.readUInt32LE(28);

		// Extract data chunk size (bytes 40-43)
		const dataSize = audioBuffer.readUInt32LE(40);

		if (sampleRate > 0 && byteRate > 0) {
			// Duration = data size / byte rate
			return Math.round(dataSize / byteRate);
		}

		return null;
	} catch (error) {
		console.warn("Failed to extract WAV duration:", error);
		return null;
	}
}

/**
 * Extract duration from any audio buffer
 * Currently only supports WAV format (which is what we generate)
 */
export function extractAudioDuration(
	audioBuffer: Buffer,
	mimeType?: string
): number | null {
	// For now, we only support WAV since that's what our TTS generates
	if (mimeType?.includes("wav") || !mimeType) {
		return extractWavDuration(audioBuffer);
	}

	// Could add support for other formats in the future if needed
	console.warn(`Unsupported audio format for duration extraction: ${mimeType}`);
	return null;
}
