import { Download, Music } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlayButton } from "@/components/episodes/play-button";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import type { Episode } from "@/lib/types";
import EpisodeCard from "./ui/episode-card";

interface EpisodeListProps {
	episodes: Episode[];
	onPlayEpisode?: (episode: Episode) => void;
	playingEpisodeId?: string | null;
	_href?: string; // TODO: remove this
}

interface UserSubscription {
	plan_type: string;
	status: string;
}

const _formatDate = (date: Date | null | undefined) => {
	if (!date) return "N/A";
	return new Date(date).toLocaleString();
};

export const EpisodeList: React.FC<EpisodeListProps> = ({ episodes, onPlayEpisode, playingEpisodeId }) => {
	const [subscription, setSubscription] = useState<UserSubscription | null>(null);
	const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());

	// Fetch user subscription status with Next.js caching (30 days)
	useEffect(() => {
		const fetchSubscription = async () => {
			try {
				const response = await fetch(`/api/account/subscription?ts=${Date.now()}`, {
					next: {
						tags: ["user_subscription"],
					},
				});
				if (response.ok) {
					const subData = await response.json();
					setSubscription(subData);
				}
			} catch (error) {
				console.error("Failed to fetch subscription:", error);
			}
		};

		fetchSubscription();
	}, []);

	// Check if user has tier 3 (CURATE_CONTROL) access
	const hasTier3Access = () => {
		if (!subscription) return false;
		const planType = subscription.plan_type?.toLowerCase();
		return planType === "curate_control" || planType === "curate control";
	};

	// Check if episode is user-generated (has profile_id)
	const isUserGeneratedEpisode = (episode: Episode) => {
		return !!episode.profile_id;
	};

	// Handle episode download
	const handleDownloadEpisode = async (episodeId: string, episodeTitle: string) => {
		if (downloadingEpisodes.has(episodeId)) return;

		setDownloadingEpisodes(prev => new Set(prev).add(episodeId));

		try {
			const response = await fetch(`/api/episodes/${episodeId}/download`);

			if (!response.ok) {
				const error = await response.json();
				toast.error(error.error || "Failed to download episode");
				return;
			}

			const { audio_url, filename } = await response.json();

			// Create download link
			const link = document.createElement("a");
			link.href = audio_url;
			link.download = filename || `${episodeTitle}.mp3`;
			link.target = "_blank";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			toast.success(`Downloading "${episodeTitle}"`);
		} catch (error) {
			console.error("Download error:", error);
			toast.error("An error occurred while downloading the episode");
		} finally {
			setDownloadingEpisodes(prev => {
				const newSet = new Set(prev);
				newSet.delete(episodeId);
				return newSet;
			});
		}
	};

	return (




		<div className="relative px-23 transition-all duration-200 text-card-foreground episode-card-wrapper-dark my-0 rounded-xl p-0  w-full">
			<CardContent>
				{episodes.length > 0 ? (
					<ul className="w-full inline-flex flex-col gap-1 p-0">
						{episodes.map(episode => {
							// Determine details link depending on whether it's user-generated or bundle episode
							const detailsHref = isUserGeneratedEpisode(episode) ? `/my-episodes/${episode.episode_id}` : `/episodes/${episode.episode_id}`;
							return (
								<EpisodeCard
									key={episode.episode_id}
									as="li"
									imageUrl={episode.image_url || null}
									title={episode.title}
									publishedAt={episode.published_at || new Date()}
									durationSeconds={episode.duration_seconds ?? null}
									detailsHref={detailsHref}
									actions={
										<div className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center hover:bg-none">
											{episode.audio_url && onPlayEpisode && (
												<PlayButton
													onClick={() => onPlayEpisode(episode)}
													aria-label={`Play ${episode.title}`}
													isPlaying={playingEpisodeId === episode.episode_id}
													className={playingEpisodeId === episode.episode_id ? "outline-accent outline-1 w-32" : ""}
												/>
											)}
											{hasTier3Access() && isUserGeneratedEpisode(episode) && episode.audio_url && (
												<Button
													onClick={() => handleDownloadEpisode(episode.episode_id, episode.title)}
													variant="outline"
													size="sm"
													disabled={downloadingEpisodes.has(episode.episode_id)}
													className="h-8">
													<Download className="w-4 h-4" />
													{downloadingEpisodes.has(episode.episode_id) ? "Downloading..." : "Download"}
												</Button>
											)}
										</div>
									}
								/>
							);
						})}
					</ul>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						<Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>No episodes available</p>
					</div>
				)}
			</CardContent>
		</div>

	);
};
