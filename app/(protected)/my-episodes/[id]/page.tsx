import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import EpisodeActionsWrapper from "@/components/features/episodes/episode-actions-wrapper";
import EpisodeHeader from "@/components/features/episodes/episode-header";
import EpisodeShell from "@/components/features/episodes/episode-shell";
import IntelligentSummaryView, {
	type TradeRecommendation,
	type DocumentContradiction,
} from "@/components/features/episodes/intelligent-summary-view";
import KeyTakeaways from "@/components/features/episodes/key-takeaways";
import { Separator } from "@/components/ui/separator";
import { getStorageReader, parseGcsUri } from "@/lib/inngest/utils/gcs";
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
	intelligence: z.any().nullable().optional(),
	created_at: z.date(),
	updated_at: z.date(),
});

type EpisodeWithSigned = UserEpisode & {
	signedAudioUrl: string | null;
	is_public: boolean;
	intelligence?: unknown;
};

async function getEpisodeWithSignedUrl(
	id: string,
	currentUserId: string
): Promise<EpisodeWithSigned | null> {
	const episode = await prisma.userEpisode.findUnique({
		where: { episode_id: id },
	});
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

	const safe = UserEpisodeSchema.parse(episode) as UserEpisode & {
		is_public: boolean;
	};
	return { ...safe, signedAudioUrl };
}

// (Local markdown utilities removed in favor of shared helpers)

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
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

	// Determine if this is a news episode and format the source display - REMOVED per user request

	// For YouTube videos, extract key takeaways
	const takeaways = extractKeyTakeaways(episode.summary);
	const _narrativeRecap = extractNarrativeRecap(episode.summary);
	const _hasSummary = Boolean(episode.summary);

	// Reshape flat intelligence data from DB to nested structure expected by component
	// The Inngest function flattens structuredData + writtenContent into the root of the JSON

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
					rightLink={{
						href: episode.youtube_url,
						label: "Youtube Url",
						external: true,
					}}
				/>
				<div className="">
					<EpisodeActionsWrapper
						episode={episode}
						signedAudioUrl={episode.signedAudioUrl}
						isPublic={episode.is_public}
					/>

					<Separator className="my-8" />
					{mappedIntelligence ? (
						<IntelligentSummaryView
							title={episode.episode_title}
							audioUrl={episode.signedAudioUrl}
							duration={episode.duration_seconds}
							publishedAt={episode.created_at}
							youtubeUrl={episode.youtube_url}
							intelligence={mappedIntelligence}
						/>
					) : (
						<KeyTakeaways items={takeaways} />
					)}
				</div>
			</div>
		</EpisodeShell>
	);
}
