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
	/** Optional display subtitle: podcast name, channel name, or sources label */
	subtitle?: string | null;
	/** Original episode data for advanced use cases */
	original: Episode | UserEpisode;
}

export type EpisodeSubtitleContext = {
	/** For bundle episodes when podcast relation name is not present */
	podcastName?: string;
	/** For user YouTube episodes, already-fetched channel name */
	youtubeChannelName?: string | null;
	/** Whether channel name is in-flight */
	isChannelLoading?: boolean;
};

/**
 * Returns a consistent subtitle string for an episode
 */
export function getEpisodeSubtitle(
	episode: Episode | UserEpisode,
	ctx: EpisodeSubtitleContext = {}
): string {
	// Bundle episode: prefer relation name, then provided podcastName, otherwise generic label
	if (isBundleEpisode(episode)) {
		const e = episode as unknown as { podcast?: { name?: string } };
		return e.podcast?.name || ctx.podcastName || "Podcast episode";
	}

	// User episode
	const _userEp = episode as UserEpisode;

	// YouTube episode
	if (ctx.isChannelLoading) return "Loading...";
	return ctx.youtubeChannelName || "YouTube Video";
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
			title: episode.episode_title || "Untitled Episode",
			source: "user",
			audioUrl: episode.gcs_audio_url || null,
			artworkUrl: null, // YouTube channel image will be fetched separately
			durationSeconds: episode.duration_seconds ?? null,
			publishedAt: episode.created_at,
			permalink: `/my-episodes/${episode.episode_id}`,
			youtubeUrl: episode.youtube_url ?? null,
			subtitle: null,
			original: episode,
		};
	}

	// Bundle episode
	return {
		id: episode.episode_id,
		title: episode.title || "Untitled Episode",
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
export function normalizeEpisodes(
	episodes: (Episode | UserEpisode)[]
): NormalizedEpisode[] {
	return episodes.map(normalizeEpisode);
}
