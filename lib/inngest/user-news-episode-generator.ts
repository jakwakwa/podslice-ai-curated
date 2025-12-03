import { createVertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";
import { z } from "zod";
import { extractUserEpisodeDuration } from "@/app/(protected)/admin/audio-duration/duration-extractor";
import { ensureGoogleCredentialsForADC } from "@/lib/google-credentials";
import {
	combineAndUploadWavChunks,
	generateSingleSpeakerTts,
	getTtsChunkWordLimit,
	sanitizeSpeakerLabels,
	splitScriptIntoChunks,
	uploadBufferToPrimaryBucket,
} from "@/lib/inngest/episode-shared";
import { generateTtsAudio } from "@/lib/inngest/utils/genai";
import { prisma } from "@/lib/prisma";
import { getSummaryLengthConfig } from "@/lib/types/summary-length";
import { inngest } from "./client";

const ALLOWED_SOURCES = ["global", "crypto", "geo", "finance", "us"] as const;

const PayloadSchema = z.object({
	userEpisodeId: z.string(),
	sources: z.array(z.enum(ALLOWED_SOURCES)),
	topic: z.string(),
	generationMode: z.enum(["single", "multi"]).default("single"),
	voiceA: z.string().optional(),
	voiceB: z.string().optional(),
	summaryLength: z.enum(["SHORT", "MEDIUM", "LONG"]).default("SHORT"),
});

// Use shared generateTtsAudio directly for multi-speaker; voice selection via param
async function ttsWithVoice(text: string, voiceName: string): Promise<Buffer> {
	return generateTtsAudio(
		`Read the following lines as ${voiceName}, in an engaging podcast style. Read only the spoken words - ignore any sound effects, stage directions, or non-spoken elements.\n\n${text}`,
		{ voiceName }
	);
}

type DialogueLine = { speaker: "HOST SLICE" | "PODSLICE GUEST"; text: string };

const DialogueSchema = z.object({
	speaker: z.enum(["HOST SLICE", "PODSLICE GUEST"]),
	text: z.string().min(1),
});

function stripMarkdownJsonFences(input: string): string {
	return input.replace(/```json\n?|\n?```/g, "").trim();
}

function coerceJsonArray(input: string): DialogueLine[] {
	const attempts: Array<() => unknown> = [
		() => JSON.parse(input),
		() => JSON.parse(input.match(/\[[\s\S]*\]/)?.[0] || "[]"),
		() => JSON.parse(stripMarkdownJsonFences(input)),
	];
	for (const attempt of attempts) {
		try {
			const parsed = attempt();
			return z.array(DialogueSchema).parse(parsed);
		} catch {}
	}
	throw new Error("Failed to parse dialogue script");
}

function buildConciseDisclosure(
	topic: string,
	parsedSummary: {
		source_strategy?: { used_alternative_sources?: boolean };
		articles?: { domain?: string; url?: string; from_priority_source?: boolean }[];
	}
): string {
	try {
		const usedFallback = Boolean(
			parsedSummary?.source_strategy?.used_alternative_sources
		);
		if (!usedFallback) return "";

		const articleList: Array<{
			domain?: string;
			url?: string;
			from_priority_source?: boolean;
		}> = Array.isArray(parsedSummary?.articles) ? parsedSummary.articles : [];

		const skipHosts = new Set([
			"vertexaisearch.cloud.google.com",
			"google.com",
			"news.google.com",
		]);

		function normalizeHost(host?: string): string | undefined {
			if (!host) return undefined;
			let h = host.toLowerCase();
			if (h.startsWith("www.")) h = h.slice(4);
			if (skipHosts.has(h)) return undefined;
			return h;
		}

		const fallbackDomains: string[] = [];
		for (const art of articleList) {
			if (fallbackDomains.length >= 3) break;
			if (art?.from_priority_source === false) {
				let domain: string | undefined = normalizeHost(art?.domain);
				if (!domain && typeof art?.url === "string") {
					try {
						const u = new URL(art.url);
						domain = normalizeHost(u.hostname);
					} catch {}
				}
				if (domain && !fallbackDomains.includes(domain)) {
					fallbackDomains.push(domain);
				}
			}
		}

		const topicText = (topic || "").toString();
		const listText =
			fallbackDomains.length > 0 ? ` like ${fallbackDomains.join(", ")}` : "";
		return `No articles about '${topicText}' were found from the specified sources; fallback sources were used${listText}.`;
	} catch {
		return "";
	}
}

export const generateUserNewsEpisode = inngest.createFunction(
	{
		id: "generate-user-news-episode-workflow",
		name: "Generate User News Episode Workflow",
		retries: 2,
		onFailure: async ({ event, step }) => {
			const { userEpisodeId } = (
				event as unknown as { data: { event: { data: { userEpisodeId?: string } } } }
			).data.event.data;
			if (!userEpisodeId) return;
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { status: "FAILED" },
			});
			try {
				const episode = await prisma.userEpisode.findUnique({
					where: { episode_id: userEpisodeId },
					select: { episode_title: true, user_id: true },
				});
				if (!episode) return;
				const user = await prisma.user.findUnique({
					where: { user_id: episode.user_id },
					select: { in_app_notifications: true },
				});
				if (user?.in_app_notifications) {
					await prisma.notification.create({
						data: {
							user_id: episode.user_id,
							type: "episode_failed",
							message: `We're sorry — we hit a technical issue while generating your episode "${episode.episode_title}". Please try again later.`,
						},
					});
				}
				// Trigger email via separate function
				await step.sendEvent("send-failed-email", {
					name: "episode.failed.email",
					data: { userEpisodeId },
				});
			} catch (err) {
				console.error("[USER_NEWS_FAILED_NOTIFY]", err);
			}
		},
	},
	{ event: "user.news.generate.requested" },
	async ({ event, step }) => {
		const {
			userEpisodeId,
			sources,
			topic,
			generationMode,
			voiceA,
			voiceB,
			summaryLength,
		} = PayloadSchema.parse(event.data);

		await step.run("mark-processing", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					status: "PROCESSING",
					progress_message: "Starting your news episode—gathering latest updates...",
				},
			});
		});

		const modelId = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
		const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
		const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

		if (!projectId) {
			throw new Error(
				"GOOGLE_CLOUD_PROJECT_ID environment variable is required for Vertex AI"
			);
		}

		// Ensure GOOGLE_APPLICATION_CREDENTIALS supports JSON-in-env on Vercel (preview/production)
		ensureGoogleCredentialsForADC();

		// Initialize Vertex AI provider with project and location
		const vertex = createVertex({
			project: projectId,
			location: location,
		});

		const allowedDomains = {
			global: [
				"theguardian.com/world",
				"abcnews.go.com",
				"npr.org",
				"aljazeera.com",
				"theguardian.com",
				"reuters",
				"bbc.com",
			],
			crypto: [
				"coindesk.com/latest-crypto-news",
				"coincentral.com",
				"coindesk.com/price/bitcoin/news",
				"tradingview.com/news/",
				"finance.yahoo.com",
			],
			geo: ["news.un.org", "worldbank.org"],
			finance: [
				"finance.yahoo.com",
				"aljazeera.com",
				"abcnews.go.com",
				"tradingview.com/news/",
				"barrons.com",
				"bloomberg.com",
				"coindesk.com/latest-crypto-news",
				"coincentral.com",
				"coindesk.com/price/bitcoin/news",
			],
			us: [
				"theguardian.com/us",
				"abcnews.go.com",
				"npr.org",
				"aljazeera.com",
				"theguardian.com",
				"reuters",
			],
		} as const;

		// Build domain constraints string
		const domainList = sources.flatMap(src => allowedDomains[src]).join(", ");

		// Adaptive research configuration
		const MIN_REQUIRED = 2; // minimum articles required to proceed without broadening
		const PRIMARY_LOOKBACK_HOURS = 72; // 3 days preferred
		const FALLBACK_LOOKBACK_HOURS = 168; // up to 7 days if needed

		const constraintText = `You are an expert researcher. Use the google_search tool.

Topic: ${topic}
Time window: Prefer last ${PRIMARY_LOOKBACK_HOURS} 12 months. If fewer than ${MIN_REQUIRED} quality articles are found in total, extend up to ${FALLBACK_LOOKBACK_HOURS} hours.

Source policy:
- PRIORITIZE these sources in this order: ${domainList}
- If total high-quality coverage from prioritized sources is below ${MIN_REQUIRED}, BROADEN to other reputable outlets (e.g., Reuters, National Geographic, Wikipedia, FT, WSJ, CNBC, The Verge, TechCrunch, Wired, Bloomberg, The Guardian, Reddit etc). Keep results topical and relative.
- When broadening, prefer outlets thematically aligned to the topic, and still include any prioritized-source items found.

Output ONLY valid JSON with this exact shape:
{
  "summary_title": string,
  "topic": [string],
  "top_headlines": string,
  "sentiment": ["Positive"|"Neutral"|"Negative"],
  "tags": [string],
  "target_audience": string,
  "ai_summary": string,
  "articles": [
    { "title": string, "url": string, "domain": string, "published_at": string, "from_priority_source": boolean, "priority_rank": number|null, "relevance": number }
  ],
  "source_strategy": {
    "min_required": ${MIN_REQUIRED},
    "used_alternative_sources": boolean,
    "deviation_note": string,
    "time_window_hours": ${PRIMARY_LOOKBACK_HOURS},
    "final_time_window_hours": number,
    "prioritized_sources": [string],
    "sources_used": [string]
  }
}

Instructions:
- Start with queries against prioritized sources. Use synonyms and related entities for the topic.
- If not enough, broaden per policy and fill the JSON. Always provide at least ${MIN_REQUIRED} articles if reasonably available on the broader web within the lookback.
- Do not output markdown fences or commentary.`;

		const fallbackConstraintText = `You are a news researcher. Use the google_search tool.

Topic: ${topic}
Time window: Prefer last ${PRIMARY_LOOKBACK_HOURS} hours; if needed, extend up to ${FALLBACK_LOOKBACK_HOURS} hours.

Source policy:
- IGNORE the previously provided source restrictions. Use reputable outlets across the web.
- Prefer outlets thematically aligned to the topic.

Output ONLY valid JSON with this exact shape:
{
  "summary_title": string,
  "topic": [string],
  "top_headlines": string,
  "sentiment": ["Positive"|"Neutral"|"Negative"],
  "tags": [string],
  "target_audience": string,
  "ai_summary": string,
  "articles": [
    { "title": string, "url": string, "domain": string, "published_at": string, "from_priority_source": false, "priority_rank": null, "relevance": number }
  ],
  "source_strategy": {
    "min_required": ${MIN_REQUIRED},
    "used_alternative_sources": true,
    "deviation_note": "Broadened beyond selected sources due to limited recent coverage.",
    "time_window_hours": ${PRIMARY_LOOKBACK_HOURS},
    "final_time_window_hours": number,
    "prioritized_sources": [${sources.map(s => `"${s}"`).join(", ")}],
    "sources_used": [string]
  }
}

Instructions:
- Provide at least ${MIN_REQUIRED} relevant articles if reasonably available.
- Do not output markdown fences or commentary.`;

		const summary = await step.run("generate-news-summary", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					progress_message: "Searching and Analysing sources...",
				},
			});

			const { text } = await generateText({
				model: vertex(modelId),
				tools: { google_search: vertex.tools.googleSearch({}) },
				providerOptions: {
					google: {
						// Thinking tokens (reasoning) for compatible Gemini models
						thinking: {
							// The SDK calls it 'budgetTokens', Google receives it as 'thinkingBudget'
							budgetTokens: 1024,

							// This was the setting causing the error because the budget above was missing
							includeThoughts: true,
						},
					},
				},
				prompt: constraintText,
			});

			// Clean up the response - remove markdown code fences if present
			let cleanedText = text.trim();
			if (cleanedText.startsWith("```json")) {
				cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
			} else if (cleanedText.startsWith("```")) {
				cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
			} else if (cleanedText.includes("```json")) {
				// Extract JSON from within markdown blocks
				const jsonMatch = cleanedText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
				if (jsonMatch) {
					cleanedText = jsonMatch[1]!;
				}
			} else if (cleanedText.includes("```")) {
				// Fallback: try to extract JSON from any markdown block
				const jsonMatch = cleanedText.match(/```\s*(\{[\s\S]*?\})\s*```/);
				if (jsonMatch) {
					cleanedText = jsonMatch[1]!;
				}
			}

			// If too few articles, rerun with broader policy
			try {
				// biome-ignore lint/suspicious/noExplicitAny: <  ai generated code >
				const parsed = JSON.parse(cleanedText) as any;
				const count = Array.isArray(parsed?.articles) ? parsed.articles.length : 0;
				if (count < MIN_REQUIRED) {
					const rerun = await generateText({
						model: vertex(modelId),
						tools: { google_search: vertex.tools.googleSearch({}) },
						providerOptions: {
							google: { thinkingConfig: { includeThoughts: true } },
						},
						prompt: fallbackConstraintText,
					});
					let rerunText = rerun.text.trim();
					if (rerunText.startsWith("```json")) {
						rerunText = rerunText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
					} else if (rerunText.startsWith("```")) {
						rerunText = rerunText.replace(/^```\s*/, "").replace(/\s*```$/, "");
					} else if (rerunText.includes("```json")) {
						const m = rerunText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
						if (m) rerunText = m[1]!;
					} else if (rerunText.includes("```")) {
						const m = rerunText.match(/```\s*(\{[\s\S]*?\})\s*```/);
						if (m) rerunText = m[1]!;
					}
					cleanedText = rerunText;
				}
			} catch {}

			return cleanedText;
		});

		await step.run("store-summary", async () => {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: { summary: summary?.trim() || "" },
			});
		});

		// Generate a concise, useful title for news episodes (≤72 chars)
		await step.run("generate-news-title", async () => {
			try {
				// Prefer the parsed ai_summary if the structured JSON is available
				let summaryContent = summary;
				try {
					const parsed = JSON.parse(summary);
					summaryContent = parsed.ai_summary || summary;
				} catch {}

				const titlePrompt = `Write ONE concise, compelling podcast episode title.\n\nConstraints:\n- Max 60 characters\n- No dates or times\n- No quotes, backticks, hashtags, or emojis\n- Not clickbait; be clear and informative\n- Use proper casing (sentence or title case)\n\nTopic: ${topic || ""}\nSummary:\n${summaryContent}`;

				const { text } = await generateText({
					model: vertex(modelId),
					prompt: titlePrompt,
				});

				const raw = (text || "").trim();
				const cleaned = raw
					.replace(/^[`"'\s]+|[`"'\s]+$/g, "")
					.replace(/[\r\n]+/g, " ")
					.replace(/\s{2,}/g, " ");

				const limit = 72;
				const finalTitle =
					cleaned.length <= limit
						? cleaned
						: (
								cleaned
									.slice(0, limit + 1)
									.split(" ")
									.slice(0, -1)
									.join(" ") || cleaned.slice(0, limit)
							).trim();

				if (finalTitle) {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: { episode_title: finalTitle },
					});
				}
			} catch (err) {
				console.warn("[NEWS_TITLE] Failed to generate title; continuing workflow", err);
			}
		});

		// Get word/minute targets based on selected length
		const lengthConfig = getSummaryLengthConfig(summaryLength);
		const [minWords, maxWords] = lengthConfig.words;
		const [minMinutes, maxMinutes] = lengthConfig.minutes;

		// Guard: avoid TTS if insufficient content after fallback
		// biome-ignore lint/suspicious/noExplicitAny: <  ai generated code >
		let parsedSummary: any = null;
		try {
			parsedSummary = JSON.parse(summary);
		} catch {}
		const parsedArticleCount = Array.isArray(parsedSummary?.articles)
			? parsedSummary.articles.length
			: 0;
		const parsedSummaryWordCount = (parsedSummary?.ai_summary || "")
			.toString()
			.split(/\s+/)
			.filter(Boolean).length;
		if (parsedArticleCount === 0 || parsedSummaryWordCount < 60) {
			await prisma.userEpisode.update({
				where: { episode_id: userEpisodeId },
				data: {
					status: "FAILED",
					progress_message:
						"We couldn’t find enough recent coverage. Please try broader sources or another topic.",
				},
			});
			return {
				message: "Insufficient content; stopped before TTS",
				userEpisodeId,
			};
		}

		if (generationMode === "single") {
			const script = await step.run("generate-single-script", async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: { progress_message: "Writing your research summary script..." },
				});

				// Parse the structured summary to extract the AI summary content
				let summaryContent = summary;
				try {
					const summaryData = JSON.parse(summary);
					summaryContent = summaryData.ai_summary || summary;
				} catch (error) {
					console.warn("Failed to parse summary, using raw text:", error);
				}

				const disclosureLine = buildConciseDisclosure(topic, parsedSummary);

				const { text } = await generateText({
					model: vertex(modelId),
					prompt: `Task: Based on the NEWS SUMMARY below, write a ${minWords}-${maxWords} word (approximately ${minMinutes}-${maxMinutes} minutes) single-narrator podcast segment where a Podslice host presents the news highlights to listeners.

Identity & framing:
- The speaker is a Podslice host summarizing research found.
- Present key facts, things important to understand and perspectives clearly.
- Maintain an informative and guiding output style.

Brand opener (must be the first line, exactly):
"Feeling lost in the noise? This summary is brought to you by Podslice. We filter out the fluff, the filler, and the drawn-out discussions, leaving you with pure, actionable knowledge. In a world full of chatter, we help you find the insight."

If DISCLOSURE is non-empty, include this exact sentence immediately after the opener:
${disclosureLine}
Tone: Investigative journalism, insightful, weighing the pros and cons. The Vibe: “A deep dive into the mechanics of modern finance.”
Hosts:

Constraints:
- No stage directions, no timestamps, no sound effects.
	(Note to Hosts: Do NOT read the text in brackets like [Thoughtful pause] or [Nods].)
- Spoken words only.
- Natural, engaging tone.
- Avoid sensationalism; stick to facts.

Structure:
- Hook that frames this as a Podslice research summary.
- Smooth transitions between items.
- Help the listener understand complex ideas in a helpful and easy to remember manner.
* incorporating elements like interruptions, 'ums,' 'ahs,' and casual language) but balanced, and still natural, emotional flow (sounding less 'read').
* Ensure the output is always less scripted than the input.
* Maintain the core content and information of the original script.
- Clear, concise wrap-up.

RESEARCH SUMMARY:
${summaryContent}`,
				});

				return text;
			});

			const chunkUrls = await step.run("generate-and-upload-tts-chunks", async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: { progress_message: "Converting script to audio..." },
				});

				const chunkWordLimit = getTtsChunkWordLimit();
				const scriptParts = splitScriptIntoChunks(script, chunkWordLimit);
				const urls: string[] = [];
				const tempPath = `user-episodes/${userEpisodeId}/temp-chunks`;

				for (let i = 0; i < scriptParts.length; i++) {
					console.log(
						`[TTS] Generating and uploading chunk ${i + 1}/${scriptParts.length}`
					);

					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: {
							progress_message: `Generating audio (part ${i + 1} of ${scriptParts.length})...`,
						},
					});
					const buf = await generateSingleSpeakerTts(scriptParts[i]!);
					const chunkFileName = `${tempPath}/chunk-${i}.wav`;
					const gcsUrl = await uploadBufferToPrimaryBucket(buf, chunkFileName);
					urls.push(gcsUrl);
				}

				console.log(`[TTS] Uploaded ${urls.length} chunks to GCS`);
				return urls;
			});

			const { gcsAudioUrl, durationSeconds } = await step.run(
				"download-combine-upload-audio",
				async () => {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: { progress_message: "Finalizing your news episode..." },
					});

					const { getStorageReader, parseGcsUri } = await import(
						"@/lib/inngest/utils/gcs"
					);
					const storageReader = getStorageReader();

					console.log(`[COMBINE] Downloading ${chunkUrls.length} chunks from GCS`);
					const audioChunkBase64: string[] = [];

					for (const gcsUrl of chunkUrls) {
						const parsed = parseGcsUri(gcsUrl);
						if (!parsed) {
							throw new Error(`Invalid GCS URI: ${gcsUrl}`);
						}
						const [buffer] = await storageReader
							.bucket(parsed.bucket)
							.file(parsed.object)
							.download();
						audioChunkBase64.push(buffer.toString("base64"));
					}

					console.log(
						`[COMBINE] Downloaded ${audioChunkBase64.length} chunks, combining`
					);
					const fileName = `user-episodes/${userEpisodeId}-${Date.now()}.wav`;
					const { finalBuffer, durationSeconds } = combineAndUploadWavChunks(
						audioChunkBase64,
						fileName
					);
					const gcsUrl = await uploadBufferToPrimaryBucket(finalBuffer, fileName);

					// Clean up temporary chunk files
					try {
						const tempPath = `user-episodes/${userEpisodeId}/temp-chunks`;
						console.log(`[CLEANUP] Deleting temp chunks at ${tempPath}`);
						for (const chunkUrl of chunkUrls) {
							const parsed = parseGcsUri(chunkUrl);
							if (parsed) {
								await storageReader
									.bucket(parsed.bucket)
									.file(parsed.object)
									.delete()
									.catch(() => {});
							}
						}
					} catch (cleanupError) {
						console.warn(`[CLEANUP] Failed to delete temp chunks:`, cleanupError);
					}

					return { gcsAudioUrl: gcsUrl, durationSeconds };
				}
			);

			await step.run("finalize-episode", async () => {
				return await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						gcs_audio_url: gcsAudioUrl,
						duration_seconds: durationSeconds,
						status: "COMPLETED",
						progress_message: null,
					},
				});
			});
		} else {
			// Multi-speaker mode
			if (!(voiceA && voiceB)) {
				throw new Error("voiceA and voiceB are required for multi-speaker mode");
			}

			// Type assertion: voiceA and voiceB are guaranteed non-undefined after the check above
			const finalVoiceA: string = voiceA;
			const finalVoiceB: string = voiceB;

			const duetLines = await step.run("generate-duet-script", async () => {
				await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: { progress_message: "Creating an engaging two-host discussion..." },
				});

				// Parse the structured summary to extract the AI summary content
				let summaryContent = summary;
				try {
					const summaryData = JSON.parse(summary);
					summaryContent = summaryData.ai_summary || summary;
				} catch (error) {
					console.warn("Failed to parse structured summary, using raw text:", error);
				}

				const disclosureLine = buildConciseDisclosure(topic, parsedSummary);

				const { text } = await generateText({
					model: vertex(modelId),
					prompt: `Task: Based on the RESEARCH SUMMARY below, write a ${minWords}-${maxWords} word (approximately ${minMinutes}-${maxMinutes} minutes) two-host podcast conversation where Podslice hosts discuss the highlights. Alternate speakers naturally. - Rewrite the input into dynamic, conversational dialogue suitable for podcast hosts.
	
Identity & framing:
- Hosts are from Podslice presenting recent research to the listener. Digesting core findings and complex theory in memorable and easy to understand ways.
- They discuss and provide context on key subjects.
- Maintain informative tone while being conversational.

	Dialogue Generation and Formatting:

    a)  maintain the standard podcast script format, clearly separating 'Stage Directions' (emotions/actions) from the spoken dialogue.

    c) Tone (Informal): Inject realistic conversational fillers ('um,' 'like,' 'you know'), slight topic drift, and simulated crosstalk/interruptions to maximize but Maintain a professional flow and utilize phrasing and pacing that feel spontaneous and emotionally appropriate without excessive fillers or interruptions.

* Maintain the core content and information of the original script.
	
Brand opener (must be the first line, exactly, spoken by HOST SLICE):
"This summary is brought to you by Podslice. In a world full of chatter, we help you find the insight."

If DISCLOSURE is non-empty, include this exact one-sentence disclosure as the next line spoken by HOST SLICE:
${disclosureLine}
	
Constraints:Structure:
- Hook that frames this as a Podslice research summary.
- Smooth transitions between items.
- Help the listener understand complex ideas in a helpful and easy to remember manner.
* Ensure the output is always less scripted than the input.
* Maintain the core content and information of the original script.
- Clear, concise wrap-up.


Overall Tone
	Act as a talented Hollywood professional script writer, specializing in crafting engaging and natural-sounding podcast dialogues for host
	
Output ONLY valid JSON array of objects with fields: speaker ("HOST SLICE" or "PODSLICE GUEST") and text (string). The text MUST NOT include any speaker names or labels; only the spoken words. No markdown.
	
NEWS SUMMARY:
${summaryContent}`,
				});

				return coerceJsonArray(text);
			});

			const lineChunkUrls = await step.run(
				"generate-and-upload-dialogue-audio",
				async () => {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: {
							progress_message: "Converting dialogue to audio...",
						},
					});

					const urls: string[] = [];
					const tempPath = `user-episodes/${userEpisodeId}/temp-dialogue-chunks`;

					for (let i = 0; i < duetLines.length; i++) {
						const line = duetLines[i]!;
						console.log(
							`[TTS] Generating and uploading line ${i + 1}/${duetLines.length} (Speaker ${line.speaker!})`
						);

						await prisma.userEpisode.update({
							where: { episode_id: userEpisodeId },
							data: {
								progress_message: `Generating audio (line ${i + 1} of ${duetLines.length})...`,
							},
						});
						const voice = line.speaker === "HOST SLICE" ? finalVoiceA : finalVoiceB;
						const sanitizedText = sanitizeSpeakerLabels(line.text);
						const audio = await ttsWithVoice(sanitizedText, voice);
						const chunkFileName = `${tempPath}/line-${i}.wav`;
						const gcsUrl = await uploadBufferToPrimaryBucket(audio, chunkFileName);
						urls.push(gcsUrl);
					}

					console.log(`[TTS] Uploaded ${urls.length} dialogue chunks to GCS`);
					return urls;
				}
			);

			const { gcsAudioUrl, durationSeconds } = await step.run(
				"download-combine-upload-multi-voice",
				async () => {
					await prisma.userEpisode.update({
						where: { episode_id: userEpisodeId },
						data: {
							progress_message: "Wrapping up your summary audio overview...",
						},
					});

					const { getStorageReader, parseGcsUri } = await import(
						"@/lib/inngest/utils/gcs"
					);
					const storageReader = getStorageReader();

					console.log(
						`[COMBINE] Downloading ${lineChunkUrls.length} dialogue chunks from GCS`
					);
					const lineAudioBase64: string[] = [];

					for (const gcsUrl of lineChunkUrls) {
						const parsed = parseGcsUri(gcsUrl);
						if (!parsed) throw new Error(`Invalid GCS URI: ${gcsUrl}`);
						const [buffer] = await storageReader
							.bucket(parsed.bucket)
							.file(parsed.object)
							.download();
						lineAudioBase64.push(buffer.toString("base64"));
					}

					console.log(`[COMBINE] Downloaded ${lineAudioBase64.length} chunks, combining`);
					const fileName = `user-episodes/${userEpisodeId}-duet-${Date.now()}.wav`;
					const { finalBuffer, durationSeconds } = combineAndUploadWavChunks(
						lineAudioBase64,
						fileName
					);
					const gcsUrl = await uploadBufferToPrimaryBucket(finalBuffer, fileName);

					// Clean up temporary chunk files
					try {
						for (const chunkUrl of lineChunkUrls) {
							const parsed = parseGcsUri(chunkUrl);
							if (parsed)
								await storageReader
									.bucket(parsed.bucket)
									.file(parsed.object)
									.delete()
									.catch(() => {});
						}
					} catch (cleanupError) {
						console.warn(`[CLEANUP] Failed to delete temp chunks:`, cleanupError);
					}

					return { gcsAudioUrl: gcsUrl, durationSeconds };
				}
			);

			await step.run("finalize-episode", async () => {
				return await prisma.userEpisode.update({
					where: { episode_id: userEpisodeId },
					data: {
						gcs_audio_url: gcsAudioUrl,
						status: "COMPLETED",
						duration_seconds: durationSeconds,
						transcript: duetLines.map(line => sanitizeSpeakerLabels(line.text)).join(" "),
						progress_message: null,
					},
				});
			});
		}

		// Extract duration (fallback if initial extraction failed)
		await step.run("extract-duration", async () => {
			const result = await extractUserEpisodeDuration(userEpisodeId);
			if (!result.success) {
				console.warn(`[DURATION_EXTRACTION] Failed to extract duration: ${result.error}`);
			}
			return result;
		});

		// Notify user (in-app notification only)
		await step.run("notify-user-in-app", async () => {
			const episode = await prisma.userEpisode.findUnique({
				where: { episode_id: userEpisodeId },
				select: { episode_id: true, episode_title: true, user_id: true },
			});

			if (!episode) return;

			const user = await prisma.user.findUnique({
				where: { user_id: episode.user_id },
				select: { in_app_notifications: true },
			});

			if (user?.in_app_notifications) {
				await prisma.notification.create({
					data: {
						user_id: episode.user_id,
						type: "episode_ready",
						message: `Your summary "${episode.episode_title}" is ready.`,
					},
				});
			}
		});

		// Trigger email via separate function (runs in Next.js runtime)
		await step.sendEvent("send-ready-email", {
			name: "episode.ready.email",
			data: { userEpisodeId },
		});

		return {
			message: "Podslice Research summary completed",
			userEpisodeId,
		};
	}
);
