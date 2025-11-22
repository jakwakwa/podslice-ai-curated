"use client";

import { Download } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { PlayButton } from "@/components/episodes/play-button";
import { Button } from "@/components/ui/button";
import EpisodeCard from "@/components/ui/episode-card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEpisodePlayer } from "@/hooks/use-episode-player";
import { normalizeEpisode } from "@/lib/episodes/normalize";
import type { Episode, UserEpisode } from "@/lib/types";

export interface PlayableEpisodeCardProps {
	/** Episode data - accepts both Episode and UserEpisode */
	episode: Episode | UserEpisode;
	/** Override play handler - defaults to useEpisodePlayer */
	onPlay?: (episode: Episode | UserEpisode) => void;
	/** Show download button (for tier 3 users) */
	showDownload?: boolean;
	/** Additional actions to render */
	renderActions?: (episode: Episode | UserEpisode) => React.ReactNode;
	/** Whether this card is selected/highlighted */
	selected?: boolean;
	/** Additional className for the outer wrapper */
	className?: string;
	/** Wrapper element type */
	as?: "li" | "div";
	/** Whether the episode is currently playing */
	isPlaying?: boolean;
}

/**
 * Unified Playable Episode Card
 *
 * This component provides a consistent way to render episode cards
 * across the application, handling both bundle episodes and user episodes.
 *
 * Features:
 * - Automatic episode normalization
 * - Consistent play button styling
 * - Optional download support
 * - Extensible actions
 * - Accessibility built-in
 */
export function PlayableEpisodeCard({
	episode,
	onPlay,
	showDownload = false,
	renderActions,
	selected = false,
	className,
	as = "div",
	isPlaying = false,
}: PlayableEpisodeCardProps) {
	const { playEpisode: defaultPlayEpisode } = useEpisodePlayer();
	const [isDownloading, setIsDownloading] = useState(false);

	// Normalize the episode for consistent handling
	const normalized = normalizeEpisode(episode);

	// Use provided onPlay or default to the hook
	const handlePlay = () => {
		if (onPlay) {
			onPlay(episode);
		} else {
			defaultPlayEpisode(episode);
		}
	};

	// Handle episode download
	const handleDownload = async () => {
		if (isDownloading) return;

		setIsDownloading(true);
		try {
			const response = await fetch(`/api/episodes/${normalized.id}/download`);

			if (!response.ok) {
				const error = await response.json();
				toast.error(error.error || "Failed to download episode");
				return;
			}

			const { audio_url, filename } = await response.json();

			// Create download link
			const link = document.createElement("a");
			link.href = audio_url;
			link.download = filename || `${normalized.title}.mp3`;
			link.target = "_blank";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			toast.success(`Downloading "${normalized.title}"`);
		} catch (error) {
			console.error("Download error:", error);
			toast.error("An error occurred while downloading the episode");
		} finally {
			setIsDownloading(false);
		}
	};

	// Check if episode has audio
	const hasAudio = !!normalized.audioUrl;

	// Determine if we should show a disabled play button with status
	let disabledReason: string | null = null;
	if (!hasAudio && normalized.source === "user") {
		const userEp = normalized.original as UserEpisode;
		if (userEp.status === "PROCESSING" || userEp.status === "PENDING") {
			disabledReason = "Episode is processing...";
		} else if (userEp.status === "FAILED") {
			disabledReason = "Episode generation failed";
		}
	}

	return (
		<EpisodeCard
			as={as}
			imageUrl={normalized.artworkUrl}
			title={normalized.title}
			publishedAt={normalized.publishedAt}
			durationSeconds={normalized.durationSeconds}
			youtubeUrl={normalized.youtubeUrl}
			detailsHref={normalized.permalink}
			isNewsEpisode={normalized.isNews}
			actions={
				<div className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center">
					{/* Play Button */}
					{hasAudio ? (
						<PlayButton
							onClick={handlePlay}
							aria-label={`Play ${normalized.title}`}
							isPlaying={isPlaying}
							className={selected ? "outline-accent outline-2" : ""}
						/>
					) : disabledReason ? (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-block cursor-not-allowed">
										<PlayButton disabled aria-label={disabledReason} />
									</span>
								</TooltipTrigger>
								<TooltipContent>
									<p>{disabledReason}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					) : null}

					{/* Download Button (for tier 3 users) */}
					{showDownload && hasAudio && normalized.source === "user" && (
						<Button
							onClick={handleDownload}
							variant="outline"
							size="sm"
							disabled={isDownloading}
							className="h-8">
							<Download className="w-4 h-4" />
							{isDownloading ? "Downloading..." : "Download"}
						</Button>
					)}

					{/* Custom Actions */}
					{renderActions?.(episode)}
				</div>
			}
		/>
	);
}
