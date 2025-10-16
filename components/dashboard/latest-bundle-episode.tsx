"use client";

import { dashboardCopy } from "@/app/(protected)/dashboard/content";
import { PlayButton } from "@/components/episodes/play-button";
import { CardContent, CardDescription } from "@/components/ui/card";
import EpisodeCard from "@/components/ui/episode-card";
import { useEpisodePlayer } from "@/hooks/use-episode-player";
import type { Episode } from "@/lib/types";

interface LatestBundleEpisodeProps {
	episode: Episode;
	bundleName: string;
}

/**
 * LatestBundleEpisode
 * Displays the most recent episode from the user's active bundle
 */
export function LatestBundleEpisode({ episode, bundleName }: LatestBundleEpisodeProps) {
	const { playEpisode } = useEpisodePlayer();
	const { sections } = dashboardCopy;

	return (
		<div className="w-full border-b-0 rounded-0 py-0 my-0 mx-0 border-[#2c2a2a17] mt-0 pt-6 px-4 sm:pt-0 md:pt-9 md:mt-0 md:mb-8 md:px-6 border-dark md:rounded-3xl overflow-hidden">
			<h3 className="flex flex-col font-bold w-full mb-4 md:flex-row items-start text-sm md:text-lg gap-2 text-secondary-foreground">
				<span className="bg-[#1ca896] font-medium text-xs rounded-sm shadow-md shadow-[#53998e91] animate-bounce ease-in-out text-[0.65rem] duration-200 lg:text-xs px-2 py-1 mr-2 text-[#fff]/80">
					{sections.latestBundle.badge}
				</span>
				{sections.latestBundle.title}
			</h3>
			<CardDescription className="text-sm leading-relaxed opacity-90 mb-0">{sections.latestBundle.descriptionTemplate(bundleName)}</CardDescription>
			<CardContent className="px-0">
				<EpisodeCard
					imageUrl={episode.image_url}
					title={episode.title}
					publishedAt={episode.published_at || episode.created_at}
					detailsHref={`/episodes/${episode.episode_id}`}
					durationSeconds={episode.duration_seconds}
					actions={<PlayButton onClick={() => playEpisode(episode)} aria-label={`Play ${episode.title}`} />}
				/>
			</CardContent>
		</div>
	);
}
