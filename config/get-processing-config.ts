/**
 * @file Centralized configuration for video processing based on environment.
 * This file dynamically calculates and provides settings for timeouts,
 * video duration limits, and other processing parameters.
 */

import { getMaxDurationSeconds } from "@/lib/env";

// Define the structure for our processing configuration
interface ProcessingConfig {
	// The maximum allowed duration of an input video in seconds.
	maxVideoDurationSeconds: number;
	// The maximum allowed duration of an input video in minutes (for client-side display).
	maxVideoDurationMinutes: number;
	// The total time window in seconds for the entire transcription saga to complete.
	providerTotalWindowSeconds: number;
	// The duration of each video chunk in seconds for transcription.
	chunkDurationSeconds: number;
	// The timeout in milliseconds for a single chunk's transcription API call.
	geminiTranscriptionTimeoutMs: number;
	// The target length in minutes for the final generated audio episode.
	episodeTargetMinutes: number;
}

/**
 * Gets the processing configuration based on the VERCEL_PLAN_LIMIT environment variable.
 * This ensures that the application's processing limits and timeouts are
 * dynamically adjusted to the capabilities of the hosting environment.
 *
 * @returns {ProcessingConfig} The appropriate processing configuration object.
 */
export function getProcessingConfig(): ProcessingConfig {
	const plan = process.env.VERCEL_PLAN_LIMIT?.toUpperCase();

	// Get max duration from environment
	const maxDurationSeconds = getMaxDurationSeconds();
	const maxDurationMinutes = Math.floor(maxDurationSeconds / 60);

	switch (plan) {
		case "HOBBY":
			console.log("Using HOBBY plan processing configuration.");
			return {
				maxVideoDurationSeconds: maxDurationSeconds,
				maxVideoDurationMinutes: maxDurationMinutes,
				providerTotalWindowSeconds: 270, // 4.5 minutes to stay safely within the 5-min limit
				chunkDurationSeconds: 300, // 5-minute chunks
				geminiTranscriptionTimeoutMs: 120000, // 2 minutes per chunk
				episodeTargetMinutes: 5,
			};
		case "PRO":
			console.log("Using PRO plan processing configuration.");
			return {
				maxVideoDurationSeconds: maxDurationSeconds,
				maxVideoDurationMinutes: maxDurationMinutes,
				providerTotalWindowSeconds: 840, // 14 minutes to stay safely within the 15-min limit
				chunkDurationSeconds: 300, // 5-minute chunks
				geminiTranscriptionTimeoutMs: 240000, // 4 minutes per chunk
				episodeTargetMinutes: 5,
			};
		default:
			console.log("Using UNLIMITED (local/default) processing configuration.");
			return {
				maxVideoDurationSeconds: maxDurationSeconds,
				maxVideoDurationMinutes: maxDurationMinutes,
				providerTotalWindowSeconds: 3600, // 1 hour
				chunkDurationSeconds: 600, // 10-minute chunks
				geminiTranscriptionTimeoutMs: 300000, // 5 minutes per chunk
				episodeTargetMinutes: 10,
			};
	}
}
