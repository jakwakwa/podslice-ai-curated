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
	created_at: z.date(),
	updated_at: z.date(),
	is_public: z.boolean(),
});

type EpisodeWithPublicUrl = UserEpisode & {
	publicAudioUrl: string | null;
	is_public: boolean;
};

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

	const safe = UserEpisodeSchema.parse(episode) as UserEpisode & {
		is_public: boolean;
	};
	return { ...safe, publicAudioUrl, transcript: null };
}

/**
 * Extract clean description from summary (handles JSON summaries for news episodes)
 */
function extractCleanDescription(
	summary: string | null | undefined,
	maxLength = 160
): string | undefined {
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
			if (jsonMatch?.[1]) {
				cleanSummary = jsonMatch[1];
			}
		} else if (cleanSummary.includes("```")) {
			const jsonMatch = cleanSummary.match(/```\s*(\{[\s\S]*?\})\s*```/);
			if (jsonMatch?.[1]) {
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
								<span className="inline-flex items-center gap-2 rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400">
									Public Episode
								</span>
							}
							rightLink={{
								href: episode.youtube_url,
								label: "Youtube Url",
								external: true,
							}}
						/>
						<div className="mt-4 my-8">
							{episode.publicAudioUrl && (
								<div className="mb-6">
									<audio controls className="w-full" src={episode.publicAudioUrl}>
										<track kind="captions" />
										Your browser does not support the audio element.
									</audio>
								</div>
							)}

							<Separator
								className="my-8"
								style={{
									borderColor: "#000 !important",
									boxShadow: "0px -1px 0px 0px rgb(0 0 0,0.7) !important",
								}}
							/>
							<KeyTakeaways items={takeaways} />
						</div>
					</div>
				</EpisodeShell>
			</div>
		</div>
	);
}
