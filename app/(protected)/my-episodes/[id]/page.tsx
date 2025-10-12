import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import EpisodeHeader from "@/components/features/episodes/episode-header";
import EpisodeShell from "@/components/features/episodes/episode-shell";
import KeyTakeaways from "@/components/features/episodes/key-takeaways";
import PlayAndShare from "@/components/features/episodes/play-and-share";
import PublicToggleButton from "@/components/features/episodes/public-toggle-button";
import { Separator } from "@/components/ui/separator";
import { getStorageReader, parseGcsUri } from "@/lib/gcs/utils/gcs";
import { extractKeyTakeaways, extractNarrativeRecap } from "@/lib/markdown/episode-text";
import { prisma } from "@/lib/prisma";
import type { UserEpisode } from "@/lib/types";

export const dynamic = "force-dynamic";

// Zod schema for validating the episode we shape
const UserEpisodeSchema = z.object({
	episode_id: z.string(),
	user_id: z.string(),
	episode_title: z.string(),
	youtube_url: z.string(),
	transcript: z.string().nullable().optional(),
	summary: z.string().nullable().optional(),
	gcs_audio_url: z.string().nullable().optional(),
	is_public: z.boolean(),
	public_gcs_audio_url: z.string().nullable().optional(),
	duration_seconds: z.number().nullable().optional(),
	status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
	news_sources: z.string().nullable().optional(),
	news_topic: z.string().nullable().optional(),
	created_at: z.date(),
	updated_at: z.date(),
});

type EpisodeWithSigned = UserEpisode & { signedAudioUrl: string | null; is_public: boolean };

async function getEpisodeWithSignedUrl(id: string, currentUserId: string): Promise<EpisodeWithSigned | null> {
	const episode = await prisma.userEpisode.findUnique({ where: { episode_id: id } });
	if (!episode || episode.user_id !== currentUserId) return null;

	let signedAudioUrl: string | null = null;
	if (episode.gcs_audio_url) {
		const parsed = parseGcsUri(episode.gcs_audio_url);
		if (parsed) {
			const reader = getStorageReader();
			const [url] = await reader
				.bucket(parsed.bucket)
				.file(parsed.object)
				.getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });
			signedAudioUrl = url;
		}
	}

	const safe = UserEpisodeSchema.parse(episode) as UserEpisode & { is_public: boolean };
	return { ...safe, signedAudioUrl };
}

// (Local markdown utilities removed in favor of shared helpers)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params;
	const { userId } = await auth();
	if (!userId) return { title: "User Episode" };
	const ep = await getEpisodeWithSignedUrl(id, userId);
	if (!ep) return { title: "Episode not found" };
	return { title: ep.episode_title, description: ep.summary ?? undefined };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const { userId } = await auth();
	if (!userId) notFound();

	const episode = await getEpisodeWithSignedUrl(id, userId);
	if (!episode) notFound();

	// Determine if this is a news episode and format the source display
	const isNewsEpisode = episode.youtube_url === "news";
	const sourceDisplay =
		isNewsEpisode && episode.news_sources
			? `Source/s: ${episode.news_sources === "stocks"
				? "PolyMarket, Traderview, Yahoo! Finance"
				: episode.news_sources
					?.split(", ")
					.map(s => s.charAt(0).toUpperCase() + s.slice(1))
					.join(", ")
			}`
			: null;

	// For YouTube videos, extract key takeaways; for news, use summary as-is
	const takeaways = !isNewsEpisode ? extractKeyTakeaways(episode.summary) : [];
	const _narrativeRecap = extractNarrativeRecap(episode.summary);
	const _hasSummary = Boolean(episode.summary);

	return (
		<EpisodeShell>
			<div>
				<EpisodeHeader
					title={episode.episode_title}
					createdAt={episode.created_at}
					durationSeconds={episode.duration_seconds ?? null}
					metaBadges={
						<span className="inline-flex">
							<span className="sr-only">status</span>
						</span>
					}
					rightLink={isNewsEpisode ? undefined : { href: episode.youtube_url, label: "Youtube Url", external: true }}
				/>
				{sourceDisplay && <div className="mt-2 text-lg font-bold text-[#ac91fc]">{sourceDisplay}</div>}
				<div className="mt-4 my-8">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<PlayAndShare kind="user" episode={episode} signedAudioUrl={episode.signedAudioUrl} isPublic={episode.is_public} />
						<PublicToggleButton episodeId={episode.episode_id} initialIsPublic={episode.is_public} />
					</div>

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
											// Extract JSON from within markdown blocks
											const jsonMatch = cleanSummary.match(/```json\s*(\{[\s\S]*?\})\s*```/);
											if (jsonMatch) {
												cleanSummary = jsonMatch[1];
											}
										} else if (cleanSummary.includes("```")) {
											// Fallback: try to extract JSON from any markdown block
											const jsonMatch = cleanSummary.match(/```\s*(\{[\s\S]*?\})\s*```/);
											if (jsonMatch) {
												cleanSummary = jsonMatch[1];
											}
										}

										// Trim any remaining whitespace
										cleanSummary = cleanSummary.trim();

										console.log("Raw summary:", episode.summary);
										console.log("Clean summary:", cleanSummary);

										const summaryData = JSON.parse(cleanSummary);
										return (
											<div className="space-y-6 " >
												{summaryData.top_headlines && (
													<div className="text-[#87f4f2fe]">
														<h4 className=" mb-2 text-large font-bold text-[#ac91fc]">Top Headlines</h4>
														<p className=" text-[#ddd8ee] font-bold	 text-2xl">{summaryData.top_headlines}</p>
													</div>
												)}
												<hr />
												<div className="flex flex-col flex-wrap gap-6 md:gap-8">



													<div className="flex flex-row gap-4 min-w-[20%]">
														{summaryData.topic && summaryData.topic.length > 0 && (
															<div className="text-[#87f4f2fe] text-sm uppercase">
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
															<div className="text-[#87f4f2fe]">
																<h4 className="font-medium mb-2 uppercase text-sm ">Sentiment Analysis</h4>
																<div className="flex flex-wrap gap-2 ">
																	{Array.isArray(summaryData.sentiment) ? (
																		summaryData.sentiment.map((s: string, i: number) => (
																			<span key={i} className="px-2 py-1 bg-violet-800 text-pink-300 rounded-md text-lg capitalize">
																				{s}
																			</span>
																		))
																	) : (
																		<span className="px-2 py-1 rounded-md text-lg  bg-violet-800 text-slate-200">{summaryData.sentiment}</span>
																	)}
																</div>
															</div>
														)}
													</div>
													{summaryData.tags && summaryData.tags.length > 0 && (
														<div className="text-[#87f4f2fe] ">
															<h4 className="font-medium mb-2 text-sm uppercase text-[#87f4f2fe]">Tags</h4>
															<div className="flex flex-wrap gap-2">
																{summaryData.tags.map((tag: string, i: number) => (
																	<span key={i} className="px-2 py-1 bg-slate-950 text-purple-400/80 rounded-md text-sm">
																		#{tag}
																	</span>
																))}
															</div>
														</div>
													)}

													{summaryData.target_audience && (
														<div className="text-[#87f4f2fe]">
															<h4 className="font-medium text-sm mb-3 uppercase">Target Audience</h4>
															<p className=" text-[#D7C4F6D7] text-base">{summaryData.target_audience}</p>
														</div>
													)}
												</div>
												<hr />

												{summaryData.ai_summary && (
													<div className="text-[#ac91fc]">
														<h4 className="font-bold text-xl mt-8 mb-4">Ai Summary</h4>
														<div className="whitespace-pre-wrap text-[#D7C4F6D7]/90 leading-[1.8] text-[17px]" >{summaryData.ai_summary}</div>
													</div>
												)}
											</div>
										);
									} catch (error) {
										// Fallback to raw text display if JSON parsing fails
										console.error("Failed to parse news summary JSON:", error);
										console.log("Raw summary that failed to parse:", episode.summary);
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
	);
}
