/**
 * Prisma query helpers to prevent accidentally loading huge fields
 * that can exceed response size limits.
 */

import type { Prisma } from "@prisma/client";

/**
 * Safe select for UserEpisode list views.
 * Excludes transcript and summary which can be megabytes each.
 * 
 * Use this for any endpoint that returns multiple episodes.
 */
export const userEpisodeListSelect = {
	episode_id: true,
	user_id: true,
	episode_title: true,
	youtube_url: true,
	gcs_audio_url: true,
	duration_seconds: true,
	status: true,
	created_at: true,
	updated_at: true,
	// Explicitly excluded: transcript, summary (can be MB each)
} satisfies Prisma.UserEpisodeSelect;

/**
 * Full select for UserEpisode detail views.
 * Includes all fields. Only use for single episode queries.
 * 
 * WARNING: Do NOT use this for findMany() queries - you'll hit
 * Prisma's 4MB response size limit!
 */
export const userEpisodeFullSelect = {
	episode_id: true,
	user_id: true,
	episode_title: true,
	youtube_url: true,
	transcript: true, // ⚠️ Can be very large
	summary: true, // ⚠️ Can be very large
	gcs_audio_url: true,
	duration_seconds: true,
	status: true,
	created_at: true,
	updated_at: true,
} satisfies Prisma.UserEpisodeSelect;

/**
 * Type for episodes returned from list queries
 */
export type UserEpisodeListItem = Prisma.UserEpisodeGetPayload<{
	select: typeof userEpisodeListSelect;
}>;

/**
 * Type for episodes returned from detail queries
 */
export type UserEpisodeFull = Prisma.UserEpisodeGetPayload<{
	select: typeof userEpisodeFullSelect;
}>;
