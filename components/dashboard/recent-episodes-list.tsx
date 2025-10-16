"use client";

import Link from "next/link";
import { dashboardCopy } from "@/app/(protected)/dashboard/content";
import { PlayButton } from "@/components/episodes/play-button";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";
import EpisodeCard from "@/components/ui/episode-card";
import { useEpisodePlayer } from "@/hooks/use-episode-player";
import type { UserEpisode } from "@/lib/types";

type UserEpisodeWithSignedUrl = UserEpisode & { signedAudioUrl: string | null };

interface RecentEpisodesListProps {
	episodes: UserEpisodeWithSignedUrl[];
	showCurateControlButton?: boolean;
}

/**
 * RecentEpisodesList
 * Displays a list of recently created user episodes
 */
export function RecentEpisodesList({ episodes, showCurateControlButton = false }: RecentEpisodesListProps) {
	const { playEpisode } = useEpisodePlayer();
	const { sections } = dashboardCopy;

	// Filter and sort episodes: only completed with audio, sorted by updated_at desc, take 3
	const displayEpisodes = episodes
		.filter(e => e.status === "COMPLETED" && !!e.signedAudioUrl)
		.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
		.slice(0, 3);

	return (
		<div className="bg-primary/70 md:bg-episode-card-wrapper w-full flex flex-col gap-0 justify-start mb-0 items-start shadow-xl shadow-indigo/30 mt-0 md:m-0 xl:flex-row md:gap-4 py-8 p-1 md:mt-4 md:mb-0 border-1 md:rounded-3xl lg:py-8 overflow-hidden md:p-0 md:justify-center align-start">
			<div className="pt-0 px-5 md:pl-8 md:mt-8 w-full max-w-[300px] flex flex-col items-start justify-items-start">
				<p className="w-full mx-0 px-0 text-secondary-foreground md:px-0 text-base font-bold mb-4">{sections.recentEpisodes.title}</p>
				<CardDescription className="w-full px-0 md:px-0 text-sm text-secondary-foreground-muted opacity-90">{sections.recentEpisodes.description}</CardDescription>
				<div className="w-full flex flex-row md:flex-col gap-2">
					{showCurateControlButton && (
						<Link href="/my-episodes" passHref className="px-0 mr-4">
							<Button variant="default" size="sm" className="mt-4">
								{sections.recentEpisodes.buttons.myEpisodes}
							</Button>
						</Link>
					)}
					<Link href="/generate-my-episodes" passHref>
						<Button variant="default" size="sm" className="mt-4">
							{sections.recentEpisodes.buttons.episodeCreator}
						</Button>
					</Link>
				</div>
			</div>
			<CardContent className="px-1 w-full md:p-8">
				{displayEpisodes.length === 0 ? (
					<p className="text-muted-foreground text-xs">{sections.recentEpisodes.emptyState}</p>
				) : (
					<ul className="bg-[#1719248a] p-2 md:px-2 rounded-xl flex flex-col w-full min-w-full overflow-hidden gap-2 lg:px-2">
						{displayEpisodes.map(episode => (
							<li key={episode.episode_id} className="list-none w-full">
								<EpisodeCard
									imageUrl={null}
									title={`${episode.episode_title}`}
									publishedAt={episode.updated_at}
									detailsHref={`/my-episodes/${episode.episode_id}`}
									youtubeUrl={episode.youtube_url}
									isNewsEpisode={!!(episode.news_sources || episode.news_topic)}
									actions={
										episode.status === "COMPLETED" &&
										episode.signedAudioUrl && (
											<PlayButton
												onClick={() => {
													// Create a normalized episode for the audio player
													const normalizedEpisode: UserEpisode = {
														episode_id: episode.episode_id,
														episode_title: episode.episode_title,
														gcs_audio_url: episode.signedAudioUrl,
														summary: episode.summary,
														created_at: episode.created_at,
														updated_at: episode.updated_at,
														user_id: episode.user_id,
														youtube_url: episode.youtube_url,
														transcript: episode.transcript,
														status: episode.status,
														duration_seconds: episode.duration_seconds,
														news_sources: episode.news_sources ?? null,
														news_topic: episode.news_topic ?? null,
														is_public: false,
														public_gcs_audio_url: null,
													};

													playEpisode(normalizedEpisode);
												}}
												aria-label={`Play ${episode.episode_title}`}
												className="m-0"
											/>
										)
									}
								/>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</div>
	);
}
