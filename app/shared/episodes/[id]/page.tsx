import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import EpisodeHeader from "@/components/features/episodes/episode-header";
import EpisodeShell from "@/components/features/episodes/episode-shell";
import IntelligentSummaryView, {
	type TradeRecommendation,
	type DocumentContradiction,
} from "@/components/features/episodes/intelligent-summary-view";
import KeyTakeaways from "@/components/features/episodes/key-takeaways";
import { Separator } from "@/components/ui/separator";

import { extractKeyTakeaways } from "@/lib/markdown/episode-text";

import { getPublicEpisode, extractCleanDescription } from "@/lib/episodes/public-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
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

	// For YouTube videos, extract key takeaways
	const takeaways = extractKeyTakeaways(episode.summary);

	// Reshape flat intelligence data from DB to nested structure expected by component
	interface StoredIntelligence {
		sentimentScore: number;
		sentimentLabel: "BULLISH" | "NEUTRAL" | "BEARISH";
		tickers: string[];
		sectorRotation?: string | null;
		executiveBrief: string;
		variantView?: string | null;
		investmentImplications: string;
		risksAndRedFlags: string;

		tradeRecommendations?: TradeRecommendation[];
		documentContradictions?: DocumentContradiction[];
	}

	let mappedIntelligence = null;
	if (episode.intelligence) {
		const raw = episode.intelligence as unknown as StoredIntelligence;
		mappedIntelligence = {
			structuredData: {
				sentimentScore: raw.sentimentScore,
				sentimentLabel: raw.sentimentLabel,
				tickers: raw.tickers,
				sectorRotation: raw.sectorRotation,
			},
			writtenContent: {
				executiveBrief: raw.executiveBrief,
				variantView: raw.variantView,
				investmentImplications: raw.investmentImplications,
				risksAndRedFlags: raw.risksAndRedFlags,
				tradeRecommendations: raw.tradeRecommendations,
				documentContradictions: raw.documentContradictions,
			},
		};
	}

	const nativePlayer = episode.publicAudioUrl ? (
		<div className="w-full">
			<audio controls className="w-full" src={episode.publicAudioUrl}>
				<track kind="captions" />
				Your browser does not support the audio element.
			</audio>
		</div>
	) : null;

	return (
		<div className="min-h-screen layout-inset-background">
			<div className="container mx-auto px-4 py-8">
				<EpisodeShell>
					<div>
						<EpisodeHeader
							title={episode.episode_title}
							createdAt={episode.created_at}
							durationSeconds={episode.duration_seconds ?? null}
							metaBadges={
								<Badge className="bg-purple-500 hover:bg-purple-600 text-white border-0 rounded-full px-2 h-6 text-[10px] font-bold">
									Public Episode
								</Badge>
							}
							rightLink={{
								href: episode.youtube_url,
								label: "Source",
								external: true,
							}}
							rightAction={
								<Link href="/">
									<Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-full px-4 h-6 text-[10px] font-bold cursor-pointer">
										Join Podslice
									</Badge>
								</Link>
							}
						/>
						<div className="mt-24 mb-8">
							{mappedIntelligence ? (
								<IntelligentSummaryView
									title={episode.episode_title}
									audioUrl={episode.publicAudioUrl}
									duration={episode.duration_seconds}
									publishedAt={episode.created_at}
									youtubeUrl={episode.youtube_url}
									intelligence={mappedIntelligence}
									customAudioPlayer={nativePlayer}
									hideHeader={true}
								/>
							) : (
								<>
									{nativePlayer && <div className="mb-6">{nativePlayer}</div>}
									<Separator
										className="my-8"
										style={{
											borderColor: "#000 !important",
											boxShadow: "0px -1px 0px 0px rgb(0 0 0,0.7) !important",
										}}
									/>
									<KeyTakeaways items={takeaways} />
								</>
							)}
						</div>
					</div>
				</EpisodeShell>
			</div>
		</div>
	);
}
