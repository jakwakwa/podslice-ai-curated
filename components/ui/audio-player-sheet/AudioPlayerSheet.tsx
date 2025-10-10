"use client";

import type { FC } from "react";
import { useMemo, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useYouTubeChannel } from "@/hooks/useYouTubeChannel";
import type { Episode, UserEpisode } from "@/lib/types";
import { Artwork } from "./Artwork";
import { EpisodeSubtitle, EpisodeTitle } from "./EpisodeSummary";
import { Transport } from "./Transport";
import { useAudioController } from "./use-audio-controller";
import { useAudioSource } from "./use-audio-source";

type AudioPlayerSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	episode: Episode | UserEpisode | null;
	podcastName?: string;
	onClose?: () => void;
};

export const AudioPlayerSheet: FC<AudioPlayerSheetProps> = ({ open, onOpenChange, episode, podcastName, onClose }) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const episodeKey = useMemo(() => {
		if (!episode) return null;
		// Prefer explicit ids where available, fallback to a stable title-based key
		const maybeId = (episode as unknown as { episode_id?: string; id?: string }).episode_id || (episode as unknown as { id?: string }).id;
		if (maybeId) return String(maybeId);
		if ("title" in (episode as Record<string, unknown>) && (episode as Record<string, unknown>).title) return String((episode as { title: string }).title);
		if ("episode_title" in (episode as Record<string, unknown>) && (episode as Record<string, unknown>).episode_title) return String((episode as { episode_title: string }).episode_title);
		return null;
	}, [episode]);

	// Get YouTube channel info for user episodes
	const youtubeUrl: string | undefined = episode && "youtube_url" in episode ? (episode.youtube_url ?? undefined) : undefined;
	const { channelName: youtubeChannelName, isLoading: isChannelLoading } = useYouTubeChannel(youtubeUrl ?? null);

	const { resolvedSrc, isResolving } = useAudioSource({ open, episode });
	const controller = useAudioController({ audioRef });

	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) onClose?.();
	};

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent side="right" className="p-0 text-[var(--audio-sheet-foreground)] w-full sm:w-[430px] md:min-w-[500px] gap-0 border-l-1 border-l-[#6e45cf66]">
				{/* Hero Section */}
				<div className="items-center flex-col align-middle h-full max-h-[600px] justify-center content-center backdrop-blur-sm bg-[#1f1a285c] p-6 pt-8 gap-4">
					{/* Artwork */}
					<Artwork episode={episode} />

					{/* Episode Title */}
					<EpisodeTitle episode={episode} />

					{/* Episode Subtitle */}
					<EpisodeSubtitle episode={episode} podcastName={podcastName} youtubeChannelName={youtubeChannelName ?? undefined} isChannelLoading={isChannelLoading} />

				</div>



				{/* Transport Controls */}
				<Transport
					isPlaying={controller.isPlaying}
					isLoading={controller.isLoading || isResolving}
					currentTime={controller.currentTime}
					duration={controller.duration}
					onToggle={controller.toggle}
					onSeek={controller.seek}
					volume={controller.volume}
					isMuted={controller.isMuted}
					onVolumeChange={controller.setVolume}
					onToggleMute={controller.toggleMute}
				/>

				{/* Hidden audio element */}
				<audio
					ref={audioRef}
					key={episodeKey ?? undefined}
					src={resolvedSrc || undefined}
					preload="metadata"
					onPlay={controller.onPlay}
					onPlaying={controller.onPlaying}
					onPause={controller.onPause}
					onTimeUpdate={controller.onTimeUpdate}
					onLoadedMetadata={controller.onLoadedMetadata}
					onDurationChange={controller.onDurationChange}
					onCanPlay={controller.onCanPlay}
					onCanPlayThrough={controller.onCanPlayThrough}
					onWaiting={controller.onWaiting}
					onStalled={controller.onStalled}
					onSeeking={controller.onSeeking}
					onSeeked={controller.onSeeked}
					onEnded={controller.onEnded}
					onError={controller.onError}
					onEmptied={controller.onEmptied}
					onLoadStart={controller.onLoadStart}
					className="hidden">
					<track kind="captions" srcLang="en" label="captions" />
				</audio>
			</SheetContent>
		</Sheet>
	);
};
