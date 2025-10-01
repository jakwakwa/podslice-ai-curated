import type { Episode, UserEpisode } from "@/lib/types";

/**
 * Source type for episodes
 */
export type EpisodeSource = "bundle" | "user";

/**
 * Normalized episode shape that works with both Episode and UserEpisode
 */
export interface NormalizedEpisode {
	/** Unique identifier */
	id: string;
	/** Episode title */
	title: string;
	/** Source type: bundle or user-generated */
	source: EpisodeSource;
	/** Audio URL for playback */
	audioUrl: string | null;
	/** Artwork/thumbnail URL */
	artworkUrl: string | null;
	/** Duration in seconds */
	durationSeconds: number | null;
	/** Published or created date */
	publishedAt: Date | string | null;
	/** Permalink to episode details page */
	permalink: string | null;
	/** YouTube URL for user episodes */
	youtubeUrl?: string | null;
	/** Original episode data for advanced use cases */
	original: Episode | UserEpisode;
}

/**
 * Type guard to check if an episode is a UserEpisode
 */
export function isUserEpisode(episode: Episode | UserEpisode): episode is UserEpisode {
	return "episode_title" in episode && "gcs_audio_url" in episode;
}

/**
 * Type guard to check if an episode is a Bundle Episode
 */
export function isBundleEpisode(episode: Episode | UserEpisode): episode is Episode {
	return "title" in episode && "audio_url" in episode && !("episode_title" in episode);
}

/**
 * Normalizes an Episode or UserEpisode into a consistent shape
 */
export function normalizeEpisode(episode: Episode | UserEpisode): NormalizedEpisode {
	if (isUserEpisode(episode)) {
		return {
			id: episode.episode_id,
			title: episode.episode_title,
			source: "user",
			audioUrl: episode.gcs_audio_url || null,
			artworkUrl: null, // YouTube channel image will be fetched separately
			durationSeconds: episode.duration_seconds ?? null,
			publishedAt: episode.created_at,
			permalink: `/my-episodes/${episode.episode_id}`,
			youtubeUrl: episode.youtube_url ?? null,
			original: episode,
		};
	}

	// Bundle episode
	return {
		id: episode.episode_id,
		title: episode.title,
		source: "bundle",
		audioUrl: episode.audio_url || null,
		artworkUrl: episode.image_url || null,
		durationSeconds: episode.duration_seconds ?? null,
		publishedAt: episode.published_at ?? episode.created_at,
		permalink: `/episodes/${episode.episode_id}`,
		youtubeUrl: null,
		original: episode,
	};
}

/**
 * Gets the artwork URL for an episode, with fallback logic
 */
export function getArtworkUrlForEpisode(
	episode: Episode | UserEpisode,
	youtubeChannelImage?: string | null
): string | null {
	if (isBundleEpisode(episode)) {
		return episode.image_url || null;
	}

	// For user episodes, prefer YouTube channel image
	if (isUserEpisode(episode) && youtubeChannelImage) {
		return youtubeChannelImage;
	}

	return null;
}

/**
 * Batch normalizes an array of episodes
 */
export function normalizeEpisodes(episodes: (Episode | UserEpisode)[]): NormalizedEpisode[] {
	return episodes.map(normalizeEpisode);
}
