import { writeEpisodeDebugLog } from "@/lib/debug-logger";
import { inngest } from "@/lib/inngest/client";
import { transcribeWithGeminiFromUrl } from "@/lib/inngest/transcripts/gemini-video";
import { getYouTubeVideoDetails } from "@/lib/inngest/utils/youtube";
import { prisma } from "@/lib/prisma";

import { classifyError, ProviderStartedSchema } from "../utils/results";

/**
 * The duration of each video chunk in seconds.
 * A value of 300 seconds (5 minutes) is chosen as a safe starting point
 * to avoid hitting token limits of the transcription API for most videos.
 * @type {number}
 */
const CHUNK_DURATION_SECONDS = 500;
export const MIN_WORD_THRESHOLD = 5;
export const MIN_CHARACTER_THRESHOLD = 20;

const STOP_WORDS = new Set([
	"a",
	"an",
	"the",
	"and",
	"or",
	"but",
	"if",
	"to",
	"of",
	"in",
	"on",
	"at",
	"is",
	"it",
	"i",
	"you",
	"we",
	"they",
	"he",
	"she",
	"be",
	"am",
	"are",
	"was",
	"were",
	"this",
	"that",
	"for",
	"with",
	"as",
	"by",
	"from",
	"so",
	"do",
	"does",
	"did",
	"have",
	"has",
	"had",
	"not",
	"no",
]);

export type TranscribedSegment = {
	index: number;
	text: string;
	startOffset: string;
	endOffset: string;
};

type DiscardedSegmentMeta = {
	index: number;
	startOffset: string;
	endOffset: string;
	reason: string;
};

export function sanitizeSegmentText(input: string): string {
	const withoutBracketedTimestamps = input
		.replace(/\[(?:\d{1,2}:){1,2}\d{2}(?:\.\d+)?\]/g, " ")
		.replace(/\((?:\d{1,2}:){1,2}\d{2}(?:\.\d+)?\)/g, " ");
	const withoutInlineTimestamps = withoutBracketedTimestamps.replace(
		/\b(?:\d{1,2}:){1,2}\d{2}(?:\.\d+)?\b/g,
		" "
	);
	const withoutSpeakerLabels = withoutInlineTimestamps.replace(
		/^[A-Z][A-Z0-9_-]{0,20}:\s+/gm,
		""
	);
	return withoutSpeakerLabels.replace(/\s+/g, " ").trim();
}

function parseOffsetSeconds(offset: string): number {
	const normalized = offset.endsWith("s") ? offset.slice(0, -1) : offset;
	const value = Number.parseFloat(normalized);
	return Number.isFinite(value) ? value : 0;
}

function analyzeSegmentText(text: string): {
	totalWords: number;
	stopWordCount: number;
	shortWordCount: number;
	dominantWord?: string;
	dominantWordFrequency: number;
	nonStopWordCount: number;
} {
	const tokens = text
		.toLowerCase()
		.split(/\s+/)
		.map(token => token.replace(/[^a-z']/g, ""))
		.filter(Boolean);

	if (tokens.length === 0) {
		return {
			totalWords: 0,
			stopWordCount: 0,
			shortWordCount: 0,
			dominantWordFrequency: 0,
			nonStopWordCount: 0,
		};
	}

	let stopWordCount = 0;
	let shortWordCount = 0;
	let dominantWord = tokens[0];
	let dominantWordFrequency = 0;
	const counts = new Map<string, number>();

	for (const word of tokens) {
		if (STOP_WORDS.has(word)) stopWordCount += 1;
		if (word.length <= 3) shortWordCount += 1;
		const nextCount = (counts.get(word) ?? 0) + 1;
		counts.set(word, nextCount);
		if (nextCount > dominantWordFrequency) {
			dominantWord = word;
			dominantWordFrequency = nextCount;
		}
	}

	const nonStopWordCount = tokens.length - stopWordCount;

	return {
		totalWords: tokens.length,
		stopWordCount,
		shortWordCount,
		dominantWord,
		dominantWordFrequency,
		nonStopWordCount,
	};
}

export function evaluateSegmentQuality(segment: TranscribedSegment): {
	valid: boolean;
	reason?: string;
} {
	const trimmed = segment.text.trim();
	const durationSeconds = Math.max(
		0,
		parseOffsetSeconds(segment.endOffset) - parseOffsetSeconds(segment.startOffset)
	);

	if (trimmed.length === 0) {
		return {
			valid: false,
			reason: durationSeconds >= 1 ? "empty_text_with_timestamp" : "empty_text",
		};
	}

	const {
		totalWords,
		stopWordCount,
		shortWordCount,
		dominantWord,
		dominantWordFrequency,
		nonStopWordCount,
	} = analyzeSegmentText(trimmed);

	if (totalWords < MIN_WORD_THRESHOLD || trimmed.length < MIN_CHARACTER_THRESHOLD) {
		return { valid: false, reason: "too_short" };
	}

	if (totalWords === 0) {
		return { valid: false, reason: "non_textual" };
	}

	if (totalWords >= 6 && stopWordCount / totalWords >= 0.9) {
		return { valid: false, reason: "stopword_ratio" };
	}

	if (totalWords >= 6 && nonStopWordCount <= 1) {
		return { valid: false, reason: "insufficient_content" };
	}

	if (
		totalWords >= 6 &&
		shortWordCount / totalWords >= 0.85 &&
		dominantWordFrequency / totalWords >= 0.75 &&
		((dominantWord?.length ?? 0) <= 3 ||
			(dominantWord ? STOP_WORDS.has(dominantWord) : false))
	) {
		return { valid: false, reason: "repetitive_short_words" };
	}

	return { valid: true };
}

function filterLowQualitySegments(segments: TranscribedSegment[]): {
	kept: TranscribedSegment[];
	discarded: DiscardedSegmentMeta[];
} {
	const kept: TranscribedSegment[] = [];
	const discarded: DiscardedSegmentMeta[] = [];

	for (const segment of segments) {
		const { valid, reason } = evaluateSegmentQuality(segment);
		if (valid) {
			kept.push(segment);
			continue;
		}
		discarded.push({
			index: segment.index,
			startOffset: segment.startOffset,
			endOffset: segment.endOffset,
			reason: reason ?? "unknown",
		});
	}

	return { kept, discarded };
}

/**
 * An Inngest function that transcribes a YouTube video using the Gemini API.
 * It employs a fan-out/fan-in pattern to handle long videos by breaking them into smaller chunks,
 * processing them in parallel, and then aggregating the results. This approach helps to avoid
 * API token limits and timeouts.
 *
 * @trigger {transcription.provider.gemini.start} - The event that initiates this worker.
 */
export const geminiVideoWorker = inngest.createFunction(
	{ id: "provider-gemini-video", name: "Provider: Gemini Video", retries: 0 },
	{ event: "transcription.provider.gemini.start" },
	async ({ event, step }) => {
		const { jobId, userEpisodeId, srcUrl } = ProviderStartedSchema.parse(event.data);

		await step.run("log-start", async () => {
			await writeEpisodeDebugLog(userEpisodeId, {
				step: "gemini",
				status: "start",
				meta: { jobId },
			});
		});

		try {
			/**
			 * Step 1: Fetches video metadata from YouTube to determine its total duration.
			 * The duration is essential for calculating the number of chunks required for transcription.
			 */
			const videoInfo = await step.run("get-video-info", async () => {
				const details = await getYouTubeVideoDetails(srcUrl);
				if (!details?.duration) {
					throw new Error("Could not retrieve video duration from YouTube API.");
				}
				return {
					duration: details.duration,
				};
			});

			const duration = videoInfo.duration;
			const chunks: { startOffset: string; endOffset: string }[] = [];

			/**
			 * Step 2: Generates an array of time-based chunks.
			 * This loop creates segments of CHUNK_DURATION_SECONDS to split the video.
			 */
			for (let i = 0; i < duration; i += CHUNK_DURATION_SECONDS) {
				chunks.push({
					startOffset: `${i}s`,
					endOffset: `${Math.min(i + CHUNK_DURATION_SECONDS, duration)}s`,
				});
			}

			await writeEpisodeDebugLog(userEpisodeId, {
				step: "gemini-chunking",
				status: "info",
				message: `Video of ${duration}s split into ${chunks.length} chunks.`,
			});

			/**
			 * Step 3: Fan-Out - Processes all generated chunks in parallel.
			 * Each chunk is passed to the `transcribeWithGeminiFromUrl` function.
			 * Any failures at this stage are caught and returned as error objects.
			 */
			const transcriptionJobs = chunks.map((chunk, index) => {
				return step.run(`transcribe-chunk-${index + 1}`, async () => {
					try {
						const transcript = await transcribeWithGeminiFromUrl(srcUrl, {
							startOffset: chunk.startOffset,
							endOffset: chunk.endOffset,
						});
						return {
							index: index + 1,
							text: sanitizeSegmentText(transcript ?? ""),
							startOffset: chunk.startOffset,
							endOffset: chunk.endOffset,
						} satisfies TranscribedSegment;
					} catch (error) {
						return {
							error: `Chunk ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`,
						};
					}
				});
			});

			const transcriptionResults = await Promise.all(transcriptionJobs);

			/**
			 * Step 4: Fan-In - Aggregates the results from all processed chunks.
			 * It separates successful transcriptions from errors.
			 */
			const { segments, errors } = transcriptionResults.reduce(
				(acc: { segments: TranscribedSegment[]; errors: string[] }, result) => {
					if (result && typeof result === "object" && "error" in result) {
						acc.errors.push(result.error);
					} else if (result && typeof result === "object" && "text" in result) {
						acc.segments.push(result);
					}
					return acc;
				},
				{ segments: [], errors: [] }
			);

			if (errors.length > 0) {
				await writeEpisodeDebugLog(userEpisodeId, {
					step: "gemini",
					status: "info",
					message: `Transcription failed for ${errors.length} chunk(s). Continuing with remaining segments.`,
					meta: { errors, severity: "warn" },
				});
			}

			if (segments.length === 0) {
				const message =
					errors.length > 0
						? `All ${errors.length} transcription chunk(s) failed.`
						: "Gemini returned no usable transcript chunks.";
				await writeEpisodeDebugLog(userEpisodeId, {
					step: "gemini",
					status: "fail",
					message,
				});
				await step.sendEvent("failed", {
					name: "transcription.failed",
					data: {
						jobId,
						userEpisodeId,
						provider: "gemini",
						errorType: "unknown",
						errorMessage: message,
					},
				});
				return;
			}

			const { kept: filteredSegments, discarded } = filterLowQualitySegments(segments);

			if (discarded.length > 0) {
				await writeEpisodeDebugLog(userEpisodeId, {
					step: "gemini-filter",
					status: "info",
					message: `Filtered out ${discarded.length} low-quality chunk(s).`,
					meta: {
						discarded,
					},
				});
			}

			const finalTranscript = filteredSegments
				.map(segment => segment.text)
				.join(" ")
				.trim();

			if (finalTranscript) {
				await step.run("store-transcript", async () => {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: { transcript: finalTranscript },
					});
				});

				await writeEpisodeDebugLog(userEpisodeId, {
					step: "gemini",
					status: "success",
					message: `Gemini transcript stored (${finalTranscript.length} chars).`,
				});

				await step.sendEvent("succeeded", {
					name: "transcription.succeeded",
					data: {
						jobId,
						userEpisodeId,
						provider: "gemini",
						transcriptLength: finalTranscript.length,
						transcriptStorage: "db",
						meta: {
							chunkCount: filteredSegments.length,
							discardedChunkCount: discarded.length,
							originalChunkCount: chunks.length,
							failedChunkCount: errors.length,
							transcriptLength: finalTranscript.length,
						},
					},
				});
			} else {
				const message =
					filteredSegments.length === 0
						? "All transcription chunks were filtered out as low quality."
						: `Gemini returned empty transcript despite ${filteredSegments.length}/${chunks.length} quality-checked chunks.`;
				await writeEpisodeDebugLog(userEpisodeId, {
					step: "gemini",
					status: "fail",
					message,
				});
				await step.sendEvent("failed", {
					name: "transcription.failed",
					data: {
						jobId,
						userEpisodeId,
						provider: "gemini",
						errorType: "unknown",
						errorMessage: message,
					},
				});
			}
		} catch (e) {
			await writeEpisodeDebugLog(userEpisodeId, {
				step: "gemini",
				status: "fail",
				message: e instanceof Error ? e.message : String(e),
			});
			const { errorType, errorMessage } = classifyError(e);
			await step.sendEvent("failed", {
				name: "transcription.failed",
				data: {
					jobId,
					userEpisodeId,
					provider: "gemini",
					errorType,
					errorMessage,
				},
			});
		}
	}
);
