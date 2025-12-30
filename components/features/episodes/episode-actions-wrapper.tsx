"use client";

import { useRef } from "react";
import type { UserEpisode } from "@/lib/types";
import PlayAndShare from "./play-and-share";
import PublicToggleButton from "./public-toggle-button";

interface EpisodeActionsWrapperProps {
	episode: UserEpisode;
	signedAudioUrl: string | null;
	isPublic: boolean;
}

/**
 * Client component wrapper that coordinates optimistic updates between
 * PlayAndShare and PublicToggleButton components
 */
export default function EpisodeActionsWrapper({
	episode,
	signedAudioUrl,
	isPublic,
}: EpisodeActionsWrapperProps) {
	// Store the callback reference so PublicToggleButton can notify PlayAndShare
	const playAndShareCallbackRef = useRef<((newIsPublic: boolean) => void) | null>(null);

	// This function will be called by PublicToggleButton when state changes
	const handleToggleSuccess = (newIsPublic: boolean) => {
		// Notify PlayAndShare component of the state change
		if (playAndShareCallbackRef.current) {
			playAndShareCallbackRef.current(newIsPublic);
		}
	};

	// This function will be called by PlayAndShare to register its callback
	const registerPlayAndShareCallback = (callback: (newIsPublic: boolean) => void) => {
		playAndShareCallbackRef.current = callback;
	};

	return (
		<div className="max-w-[70vw] w-1/3">
			<PlayAndShare
				kind="user"
				episode={episode}
				signedAudioUrl={signedAudioUrl}
				isPublic={isPublic}
				onPublicStateChange={registerPlayAndShareCallback}
			/>

			<PublicToggleButton
				episodeId={episode.episode_id}
				initialIsPublic={isPublic}
				onToggleSuccess={handleToggleSuccess}
			/>
		</div>
	);
}
