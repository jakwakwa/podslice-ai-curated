"use client";

import { Music } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { PlayableEpisodeCard } from "@/components/episodes/playable-episode-card";
import { CardContent } from "@/components/ui/card";
import { normalizeEpisode } from "@/lib/episodes/normalize";
import type { Episode, UserEpisode } from "@/lib/types";

export interface UnifiedEpisodeListProps {
	/** List of episodes to render */
	episodes: (Episode | UserEpisode)[];
	/** Optional override for play handler */
	onPlayEpisode?: (episode: Episode | UserEpisode) => void;
	/** Currently playing episode ID */
	playingEpisodeId?: string | null;
	/** Selected episode ID for highlighting */
	selectedId?: string | null;
	/** Show download button for episodes */
	showDownload?: boolean;
	/** Custom empty state component */
	emptyState?: React.ReactNode;
	/** Layout mode */
	layout?: "list" | "grid";
	/** Additional actions to render for each episode */
	renderActions?: (episode: Episode | UserEpisode) => React.ReactNode;
	/** Filter to apply to episodes (e.g., completedOnly for user episodes) */
	filterCompleted?: boolean;
	/** Auto-scroll to selected episode on mount */
	autoScrollToSelected?: boolean;
}

/**
 * Unified Episode List Component
 *
 * A single, consolidated component for rendering lists of episodes.
 * Handles both bundle episodes and user-generated summaries consistently.
 *
 * Features:
 * - Works with Episode and UserEpisode types
 * - Consistent PlayableEpisodeCard rendering
 * - Optional download support
 * - Highlighting and selection
 * - Auto-scroll to selected episode
 * - Customizable empty state
 * - List or grid layout
 */
export function UnifiedEpisodeList({
	episodes,
	onPlayEpisode,
	playingEpisodeId,
	selectedId,
	showDownload = false,
	emptyState,
	layout = "list",
	renderActions,
	filterCompleted = false,
	autoScrollToSelected = false,
}: UnifiedEpisodeListProps) {
	const [shouldScroll, setShouldScroll] = useState(autoScrollToSelected);

	// Filter episodes if needed
	let filteredEpisodes = episodes;
	if (filterCompleted) {
		filteredEpisodes = episodes.filter(ep => {
			// Check if it's a UserEpisode with COMPLETED status
			if ("status" in ep && "signedAudioUrl" in ep) {
				return ep.status === "COMPLETED" && !!ep.signedAudioUrl;
			}
			return true;
		});
	}

	// Auto-scroll to selected episode
	useEffect(() => {
		if (shouldScroll && selectedId) {
			const element = document.getElementById(`episode-${selectedId}`);
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "center" });
				setShouldScroll(false);
			}
		}
	}, [selectedId, shouldScroll]);

	// Empty state
	if (filteredEpisodes.length === 0) {
		if (emptyState) {
			return <>{emptyState}</>;
		}

		return (
			<div className="text-center py-8 bg-[#18141eb5] text-muted-foreground">
				<Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
				<p>No episodes available</p>
			</div>
		);
	}

	const layoutClasses =
		layout === "grid"
			? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
			: "w-full inline-flex flex-col gap-1";

	return (
		<div className="border-[#ffffff0e] relative">
			<div className="top-shadow"></div>
			<div className="relative transition-all duration-200 text-card-foreground  rounded-xl p-0 md:min-h-[420px] w-full h-fit">
				<CardContent>
					<ul className={layoutClasses}>
						{filteredEpisodes.map(episode => {
							const normalized = normalizeEpisode(episode);
							const isSelected = selectedId === normalized.id;
							const isPlaying = playingEpisodeId === normalized.id;

							return (
								<PlayableEpisodeCard
									key={normalized.id}
									episode={episode}
									as="li"
									onPlay={onPlayEpisode}
									showDownload={showDownload}
									selected={isSelected}
									isPlaying={isPlaying}
									renderActions={renderActions}
									className={isSelected ? "ring-2 ring-accent" : ""}
								/>
							);
						})}
					</ul>
				</CardContent>
			</div>
		</div>
	);
}
