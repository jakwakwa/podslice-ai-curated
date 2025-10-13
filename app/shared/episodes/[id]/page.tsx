import { NewspaperIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import EpisodeHeader from "@/components/features/episodes/episode-header";
import EpisodeShell from "@/components/features/episodes/episode-shell";
import KeyTakeaways from "@/components/features/episodes/key-takeaways";
import { Separator } from "@/components/ui/separator";
import { ensureSharedBucketName, parseGcsUri } from "@/lib/inngest/utils/gcs";
import { extractKeyTakeaways } from "@/lib/markdown/episode-text";
import { prisma } from "@/lib/prisma";
import type { UserEpisode } from "@/lib/types";

export const dynamic = "force-dynamic";

// Zod schema for validating the episode
const UserEpisodeSchema = z.object({
	episode_id: z.string(),
	user_id: z.string(),
	episode_title: z.string(),
	youtube_url: z.string(),
	transcript: z.string().nullable().optional(),
	summary: z.string().nullable().optional(),
	public_gcs_audio_url: z.string().nullable().optional(),
	duration_seconds: z.number().nullable().optional(),
	status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
	news_sources: z.string().nullable().optional(),
	news_topic: z.string().nullable().optional(),
	created_at: z.date(),
	updated_at: z.date(),
	is_public: z.boolean(),
});

type EpisodeWithPublicUrl = UserEpisode & { publicAudioUrl: string | null; is_public: boolean };

async function getPublicEpisode(id: string): Promise<EpisodeWithPublicUrl | null> {
	const episode = await prisma.userEpisode.findUnique({
		where: { episode_id: id, is_public: true },
		select: {
			episode_id: true,
			user_id: true,
			episode_title: true,
			youtube_url: true,
			summary: true,
			public_gcs_audio_url: true,
			duration_seconds: true,
			status: true,
			news_sources: true,
			news_topic: true,
			created_at: true,
			updated_at: true,
			is_public: true,
			transcript: false, // Don't expose full transcript publicly
		},
	});

	if (!episode) return null;
	if (!episode.is_public) return null;

	// Get public URL
	let publicAudioUrl: string | null = null;
	const publicGcsUrl = episode.public_gcs_audio_url;
	if (publicGcsUrl) {
		const parsed = parseGcsUri(publicGcsUrl);
		if (parsed) {
			const sharedBucket = ensureSharedBucketName();
			// Public URL format
			publicAudioUrl = `https://storage.googleapis.com/${sharedBucket}/${parsed.object}`;
		}
	}

	const safe = UserEpisodeSchema.parse(episode) as UserEpisode & { is_public: boolean };
	return { ...safe, publicAudioUrl, transcript: null };
}

/**
 * Extract clean description from summary (handles JSON summaries for news episodes)
 */
function extractCleanDescription(summary: string | null | undefined, maxLength = 160): string | undefined {
	if (!summary) return undefined;

	try {
		// Try to parse as JSON first (news episodes)
		let cleanSummary = summary.trim();

		// Remove code block markers if present
		if (cleanSummary.startsWith("```json")) {
			cleanSummary = cleanSummary.replace(/^```json\s*/, "").replace(/\s*```$/, "");
		} else if (cleanSummary.startsWith("```")) {
			cleanSummary = cleanSummary.replace(/^```\s*/, "").replace(/\s*```$/, "");
		} else if (cleanSummary.includes("```json")) {
			const jsonMatch = cleanSummary.match(/```json\s*(\{[\s\S]*?\})\s*```/);
			if (jsonMatch) {
				cleanSummary = jsonMatch[1];
			}
		} else if (cleanSummary.includes("```")) {
			const jsonMatch = cleanSummary.match(/```\s*(\{[\s\S]*?\})\s*```/);
			if (jsonMatch) {
				cleanSummary = jsonMatch[1];
			}
		}

		cleanSummary = cleanSummary.trim();

		// Try to parse as JSON
		const summaryData = JSON.parse(cleanSummary);

		// Extract meaningful text from JSON (prioritize fields that make good descriptions)
		if (summaryData.top_headlines) {
			return summaryData.top_headlines.substring(0, maxLength);
		}
		if (summaryData.ai_summary) {
			return summaryData.ai_summary.substring(0, maxLength);
		}
		if (summaryData.summary_title) {
			return summaryData.summary_title.substring(0, maxLength);
		}

		// Fallback: just use a generic description
		return "Listen to this AI-curated podcast episode";
	} catch {
		// Not JSON, use as-is (regular YouTube episode summary)
		return summary.substring(0, maxLength);
	}
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params;
	const ep = await getPublicEpisode(id);
	if (!ep) return { title: "Episode not found" };

	const description = extractCleanDescription(ep.summary);

	return {
		title: ep.episode_title,
		description,
		openGraph: {
			title: ep.episode_title,
			description,
			type: "music.song",
			siteName: "Podslice",
		},
		twitter: {
			card: "summary_large_image",
			title: ep.episode_title,
			description,
		},
	};
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const episode = await getPublicEpisode(id);

	if (!episode) notFound();

	// Determine if this is a news episode
	const isNewsEpisode = episode.youtube_url === "news";
	const sourceDisplay =
		isNewsEpisode && episode.news_sources
			? ` ${episode.news_sources === "stocks"
				? "PolyMarket, Traderview, Yahoo! Finance"
				: episode.news_sources
					?.split(", ")
					.map(s => s.charAt(0).toUpperCase() + s.slice(1))
					.join(", ")
			}`
			: null;

	// For YouTube videos, extract key takeaways; for news, use summary as-is
	const takeaways = !isNewsEpisode ? extractKeyTakeaways(episode.summary) : [];

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				<EpisodeShell>
					<div>
						<EpisodeHeader
							title={episode.episode_title}
							createdAt={episode.created_at}
							durationSeconds={episode.duration_seconds ?? null}
							metaBadges={<span className="inline-flex items-center gap-2 rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400">Public Episode</span>}
							rightLink={isNewsEpisode ? undefined : { href: episode.youtube_url, label: "Youtube Url", external: true }}
						/>
						<div className="flex items-center gap-2 mt-2 text-lg font-bold text-[#90b4f7]">
							{sourceDisplay && <NewspaperIcon color="#71D1E7" />}
							{sourceDisplay}
						</div>
						<div className="mt-4 my-8">
							{episode.publicAudioUrl && (
								<div className="mb-6">
									<audio controls className="w-full" src={episode.publicAudioUrl}>
										<track kind="captions" />
										Your browser does not support the audio element.
									</audio>
								</div>
							)}

							<Separator className="my-8" />
							{isNewsEpisode ? (
								episode.summary && (
									<div className="prose prose-sm max-w-none dark:prose-invert">
										{(() => {
											try {
												// Clean the summary string first
												let cleanSummary = episode.summary.trim();

												// Try multiple approaches to extract clean JSON
												if (cleanSummary.startsWith("```json")) {
													cleanSummary = cleanSummary.replace(/^```json\s*/, "").replace(/\s*```$/, "");
												} else if (cleanSummary.startsWith("```")) {
													cleanSummary = cleanSummary.replace(/^```\s*/, "").replace(/\s*```$/, "");
												} else if (cleanSummary.includes("```json")) {
													const jsonMatch = cleanSummary.match(/```json\s*(\{[\s\S]*?\})\s*```/);
													if (jsonMatch) {
														cleanSummary = jsonMatch[1];
													}
												} else if (cleanSummary.includes("```")) {
													const jsonMatch = cleanSummary.match(/```\s*(\{[\s\S]*?\})\s*```/);
													if (jsonMatch) {
														cleanSummary = jsonMatch[1];
													}
												}

												cleanSummary = cleanSummary.trim();
												const summaryData = JSON.parse(cleanSummary);

												return (
													<div className="space-y-6">
														{summaryData.top_headlines && (
															<div className="text-[#87f4f2fe]">
																<h4 className="mb-2 text-large font-bold text-[#ac91fc]">Top Headlines</h4>
																<p className="text-[#ddd8ee] font-bold text-2xl">{summaryData.top_headlines}</p>
															</div>
														)}
														<hr />
														<div className="flex flex-col flex-wrap gap-6 md:gap-8">
															<div className="flex flex-row gap-4 min-w-[20%]">
																{summaryData.topic && summaryData.topic.length > 0 && (
																	<div className="text-[#ac91fc] text-sm uppercase">
																		<h4 className="font-medium mb-2">Topic</h4>
																		<div className="flex flex-wrap gap-2">
																			{summaryData.topic.map((t: string, i: number) => (
																				<span key={i} className="px-2 py-1 bg-pink-800 text-pink-300 rounded-md text-lg capitalize">
																					{t}
																				</span>
																			))}
																		</div>
																	</div>
																)}

																{summaryData.sentiment && (
																	<div className="text-[#ac91fc]">
																		<h4 className="font-medium mb-2 uppercase text-sm">Sentiment Analysis</h4>
																		<div className="flex flex-wrap gap-2">
																			{Array.isArray(summaryData.sentiment) ? (
																				summaryData.sentiment.map((s: string, i: number) => (
																					<span key={i} className="px-2 py-1 bg-violet-800 text-pink-300 rounded-md text-lg capitalize">
																						{s}
																					</span>
																				))
																			) : (
																				<span className="px-2 py-1 rounded-md text-lg bg-violet-800 text-slate-200">{summaryData.sentiment}</span>
																			)}
																		</div>
																	</div>
																)}
															</div>
															{summaryData.tags && summaryData.tags.length > 0 && (
																<div className="text-[#ac91fc]">
																	<h4 className="font-medium mb-2 text-sm uppercase text-[#ac91fc]">Tags</h4>
																	<div className="flex flex-wrap gap-2">
																		{summaryData.tags.map((tag: string, i: number) => (
																			<span key={i} className="px-2 py-1 bg-slate-950 text-[#91affcbb] rounded-md text-sm">
																				#{tag}
																			</span>
																		))}
																	</div>
																</div>
															)}

															{summaryData.target_audience && (
																<div className="text-[#ac91fc]">
																	<h4 className="font-medium text-lg mb-3 uppercase">Target Audience</h4>
																	<p className="text-[#7c98f6] text-base">{summaryData.target_audience}</p>
																</div>
															)}
														</div>
														<hr />

														{summaryData.ai_summary && (
															<div className="text-[#9574fb]">
																<h4 className="font-bold text-xl mt-8 mb-4">Ai Summary</h4>
																<div className="whitespace-pre-wrap text-[#93A3F2]/80 leading	-[1.8] text-[17px]">{summaryData.ai_summary}</div>
															</div>
														)}
													</div>
												);
											} catch (error) {
												console.error("Failed to parse news summary JSON:", error);
												return (
													<div>
														<h3 className="text-lg font-semibold mb-4 text-[#ac91fc]">Summary</h3>
														<div className="whitespace-pre-wrap text-[#F0BCFAD7]/90">{episode.summary}</div>
													</div>
												);
											}
										})()}
									</div>
								)
							) : (
								<KeyTakeaways items={takeaways} />
							)}
						</div>
					</div>
				</EpisodeShell>
			</div>
		</div>
	);
}
