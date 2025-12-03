"use client";

import { useCallback } from "react";
import type { Episode, UserEpisode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";

/**
 * Hook to manage episode playback
 *
 * This hook abstracts the audio player store integration,
 * providing a clean API for playing episodes without directly
 * coupling components to the store implementation.
 */
export function useEpisodePlayer() {
	const { setEpisode, episode: currentEpisode } = useAudioPlayerStore();

	/**
	 * Play an episode
	 * Accepts both Episode and UserEpisode types
	 */
	const playEpisode = useCallback(
		(episode: Episode | UserEpisode) => {
			console.log("useEpisodePlayer - Playing episode:", episode);
			setEpisode(episode);
		},
		[setEpisode]
	);

	/**
	 * Check if a specific episode is currently playing
	 */
	const isPlaying = useCallback(
		(episodeId: string) => {
			if (!currentEpisode) return false;

			// Handle both Episode and UserEpisode types
			const currentId = "episode_id" in currentEpisode ? currentEpisode.episode_id : null;

			return currentId === episodeId;
		},
		[currentEpisode]
	);

	return {
		playEpisode,
		isPlaying,
		currentEpisode,
	};
}
