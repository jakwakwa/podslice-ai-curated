import { prisma } from "@/lib/prisma";
import { userIsActive } from "@/lib/usage";
import { getStorageReader, parseGcsUri } from "@/lib/inngest/utils/gcs";
import type { 
	Episode, 
	UserCurationProfileWithRelations, 
	UserEpisode,
	Bundle,
	Podcast
} from "@/lib/types";
import type { Prisma } from "@prisma/client";

export type UserEpisodeWithSignedUrl = UserEpisode & { signedAudioUrl: string | null };

export interface ISubscriptionInfo {
	plan_type: string;
	status: string;
}

/**
 * Fetch user curation profile with selected bundle and episodes
 * Handles the transformation of bundle_podcast relation to podcasts array
 */
export async function fetchUserCurationProfile(
	userId: string
): Promise<UserCurationProfileWithRelations | null> {
	try {
		const profile = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId },
			include: {
				selectedBundle: {
					include: {
						bundle_podcast: { include: { podcast: true } },
					},
				},
				episodes: true,
			},
		});

		if (!profile) return null;

		// Safely transform selectedBundle if it exists
		let selectedBundleWithPodcasts: (Bundle & { podcasts: Podcast[] }) | null = null;

		if (profile.selectedBundle) {
			const { bundle_podcast, ...bundleData } = profile.selectedBundle;
			
			// Remove binary data (image_data) if it exists to prevent passing large data to client
			// and unnecessary internal fields
			const safeBundleData = { ...bundleData };
			
			// Although image_data is in the Bundle type, we might want to exclude it for the client
			// However, UserCurationProfileWithRelations expects Bundle which has image_data as Bytes | null
			// We'll keep it compliant with the type definition but rely on standard serialization if needed
			// or if explicit exclusion is required, we'd need to adjust the return type.
			// The original code did some messy casting. Here we trust Prisma's return type but map the relation.
			
			selectedBundleWithPodcasts = {
				...safeBundleData,
				podcasts: bundle_podcast.map((bp) => bp.podcast),
			};
		}

		return {
			...profile,
			selectedBundle: selectedBundleWithPodcasts,
		};
	} catch (error) {
		console.error("Failed to fetch user curation profile:", error);
		return null;
	}
}

/**
 * Fetch bundle episodes for the user's selected bundle
 */
export async function fetchBundleEpisodes(userId: string): Promise<Episode[]> {
	try {
		const profile = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId },
			select: { selected_bundle_id: true, is_bundle_selection: true },
		});

		const hasValidBundleSelection =
			profile?.is_bundle_selection && profile?.selected_bundle_id;
		if (!hasValidBundleSelection) {
			return [];
		}

		const episodes = await prisma.episode.findMany({
			where: { bundle_id: profile.selected_bundle_id },
			orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
		});

		return episodes;
	} catch (error) {
		console.error("Failed to fetch bundle episodes:", error);
		return [];
	}
}

/**
 * Fetch user's generated summaries with signed URLs
 */
export async function fetchUserEpisodes(userId: string): Promise<UserEpisodeWithSignedUrl[]> {
	try {
		// Check if user is active
		const isActive = await userIsActive(prisma, userId);
		if (!isActive) {
			return [];
		}

		const episodes = await prisma.userEpisode.findMany({
			where: { user_id: userId },
			// Only include fields that are needed by RecentEpisodesList and audio player
			select: {
				episode_id: true,
				user_id: true,
				episode_title: true,
				youtube_url: true,
				gcs_audio_url: true,
				duration_seconds: true,
				status: true,
				summary: true,
				summary_length: true,
				news_sources: true,
				news_topic: true,
				created_at: true,
				updated_at: true,
                auto_generated: true,
                progress_message: true,
                is_public: true,
                public_gcs_audio_url: true,
                transcript: false, // Explicitly excluded in select above implicitly by omission, but ensuring type match
			},
			orderBy: { created_at: "desc" },
		});

		// Generate signed URLs
		const storageReader = getStorageReader();
		const episodesWithSignedUrls = await Promise.all(
			episodes.map(async (episode) => {
				let signedAudioUrl: string | null = null;
				if (episode.gcs_audio_url) {
					const parsed = parseGcsUri(episode.gcs_audio_url);
					if (parsed) {
						const [url] = await storageReader
							.bucket(parsed.bucket)
							.file(parsed.object)
							.getSignedUrl({
								version: "v4",
								action: "read",
								expires: Date.now() + 3600 * 1000, // 1 hour
							});
						signedAudioUrl = url;
					}
				}
				// We need to ensure the returned object matches UserEpisodeWithSignedUrl
				// The select above returns a subset of UserEpisode.
                // To satisfy the type fully, we cast to UserEpisodeWithSignedUrl as the missing fields (transcript) are optional/nullable or we accept the partial nature for UI.
                // However, the type UserEpisode includes all fields.
                // Let's construct it carefully.
                
				return { ...episode, signedAudioUrl } as unknown as UserEpisodeWithSignedUrl;
			})
		);

		return episodesWithSignedUrls;
	} catch (error) {
		console.error("Failed to fetch user episodes:", error);
		return [];
	}
}

/**
 * Fetch user subscription info
 */
export async function fetchSubscription(userId: string): Promise<ISubscriptionInfo | null> {
	try {
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: userId },
			select: {
				plan_type: true,
				status: true,
			},
		});

		if (!subscription) {
			return null;
		}

		return subscription as ISubscriptionInfo;
	} catch (error) {
		console.error("Failed to fetch subscription:", error);
		return null;
	}
}

/**
 * Get the latest bundle episode sorted by published_at or created_at
 */
export function getLatestBundleEpisode(episodes: Episode[]): Episode | null {
	if (episodes.length === 0) return null;

	const sorted = [...episodes].sort((a, b) => {
		const dateA = new Date(a.published_at || a.created_at).getTime();
		const dateB = new Date(b.published_at || b.created_at).getTime();
		return dateB - dateA;
	});

	return sorted[0] ?? null;
}

