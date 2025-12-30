import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { AutoEpisodesStatusCard } from "@/components/dashboard/auto-episodes-status-card";
import { BundleFeedSection } from "@/components/dashboard/bundle-feed-section";
import { DashboardClientWrapper } from "@/components/dashboard/dashboard-client-wrapper";
import {
	BundleFeedSkeleton,
	RecentListSkeleton,
} from "@/components/dashboard/dashboard-skeleton";
import { EpisodeStatusTable } from "@/components/dashboard/episode-status-table";
import { LatestBundleEpisode } from "@/components/dashboard/latest-bundle-episode";
import { MarketPulseTable } from "@/components/dashboard/market-pulse-table";
import { TickerTape } from "@/components/dashboard/ticker-tape";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getStorageReader, parseGcsUri } from "@/lib/inngest/utils/gcs";
import { prisma } from "@/lib/prisma";
import type { Episode, UserCurationProfileWithRelations, UserEpisode } from "@/lib/types";
import { userIsActive } from "@/lib/usage";
import { dashboardCopy } from "./content";

type UserEpisodeWithSignedUrl = UserEpisode & { signedAudioUrl: string | null };

interface ISubscriptionInfo {
	plan_type: string;
	status: string;
}

/**
 * Dashboard Page
 * Thin server component that fetches data and composes client components
 */
export default async function DashboardPage() {
	const { userId } = await auth();

	if (!userId) {
		return null;
	}

	// Fetch all data in parallel on the server
	const [userCurationProfile, bundleEpisodes, userEpisodes, subscription] =
		await Promise.all([
			fetchUserCurationProfile(userId),
			fetchBundleEpisodes(userId),
			fetchUserEpisodes(userId),
			fetchSubscription(userId),
		]);

	// Derive the latest bundle episode on the server
	const latestBundleEpisode = getLatestBundleEpisode(bundleEpisodes);

	const hasProfile = !!userCurationProfile;
	const isBundleSelection = hasProfile && userCurationProfile.is_bundle_selection;
	const _hasBundle = isBundleSelection && !!latestBundleEpisode;
	const hasCurateControl =
		(subscription?.plan_type || "").toLowerCase() === "curate_control";
	const _showCurateControlButton = hasCurateControl;

	return (
		<div className="h-full rounded-none  px-0 mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl md:mt-0 md:p-8 md:w-full md:gap-y-4">
			<PageHeader
				title={dashboardCopy.header.title}
				description={dashboardCopy.header.description}
			/>

			{/* Episode Generation Status - Real-time updates */}
			<EpisodeStatusTable defaultExpanded={true} />

			{/* Auto-Generated Episodes Status Card - Only for Curate Control users */}
			{hasCurateControl && (
				<Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
					<AutoEpisodesStatusCard />
				</Suspense>
			)}

			{/* Bundle Feed Section */}

			{/* Empty state and modals */}
			<DashboardClientWrapper
				hasProfile={hasProfile}
				userCurationProfile={userCurationProfile}
			/>
			<div className="flex flex-col md:flex-col xl:flex-row w-full gap-4">
				{/* Recent Episodes Section */}
				<Suspense fallback={<RecentListSkeleton />}>
					{/* Bundle Feed Section */}
					{userCurationProfile?.is_bundle_selection ? (
						<Suspense fallback={<BundleFeedSkeleton />}>
							<div className="flex flex-col w-screen lg:max-w-[400px] lg:w-full gap-4">
								<BundleFeedSection
									userCurationProfile={userCurationProfile}
									subscription={subscription}
									bundleEpisodes={bundleEpisodes}
								/>
								{latestBundleEpisode && (
									<LatestBundleEpisode
										episode={latestBundleEpisode}
										bundleName={userCurationProfile?.selectedBundle?.name || ""}
									/>
								)}
							</div>
						</Suspense>
					) : null}
					<div className="flex flex-col gap-4 w-full">
						<TickerTape />
						<MarketPulseTable episodes={userEpisodes} />
					</div>
				</Suspense>
			</div>
		</div>
	);
}

/**
 * Fetch user curation profile with selected bundle and episodes
 */
async function fetchUserCurationProfile(
	userId: string
): Promise<UserCurationProfileWithRelations | null> {
	try {
		const profile = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId },
			include: {
				// We need bundle -> podcasts, but must not pass binary fields to the client
				selectedBundle: {
					include: {
						bundle_podcast: { include: { podcast: true } },
					},
				},
				episodes: true,
			},
		});

		if (!profile) return null;

		// Shape selectedBundle to exclude binary fields and expose a simple podcasts[] array
		const rawSelected = (profile as unknown as Record<string, unknown>)
			.selectedBundle as unknown as
			| (Record<string, unknown> & {
					bundle_podcast?: Array<{ podcast: unknown }>;
					image_url?: unknown;
					image_type?: unknown;
			  })
			| null;

		if (!rawSelected) {
			return profile as unknown as UserCurationProfileWithRelations;
		}

		const {
			image_data: _imgData,
			image_type: _imgType,
			bundle_podcast,
			...rest
		} = rawSelected;
		const podcasts = Array.isArray(bundle_podcast)
			? bundle_podcast.map(bp => bp.podcast as unknown)
			: [];

		const shapedSelectedBundle = {
			...rest,
			podcasts,
		} as unknown;

		return {
			...(profile as unknown as UserCurationProfileWithRelations),
			selectedBundle:
				shapedSelectedBundle as unknown as UserCurationProfileWithRelations["selectedBundle"],
		};
	} catch (error) {
		console.error("Failed to fetch user curation profile:", error);
		return null;
	}
}

/**
 * Fetch bundle episodes for the user's selected bundle
 */
async function fetchBundleEpisodes(userId: string): Promise<Episode[]> {
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

		return episodes as Episode[];
	} catch (error) {
		console.error("Failed to fetch bundle episodes:", error);
		return [];
	}
}

/**
 * Fetch user's generated summaries with signed URLs
 */
async function fetchUserEpisodes(userId: string): Promise<UserEpisodeWithSignedUrl[]> {
	try {
		// Check if user is active
		const isActive = await userIsActive(prisma, userId);
		if (!isActive) {
			return [];
		}

		// Fetch episodes from Prisma
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
				// B2B Intelligence
				sentiment: true,
				sentiment_score: true,
				mentioned_assets: true,
				voice_archetype: true,

				created_at: true,
				updated_at: true,
			},
			orderBy: { created_at: "desc" },
		});

		// Generate signed URLs
		const storageReader = getStorageReader();
		const episodesWithSignedUrls = await Promise.all(
			episodes.map(async episode => {
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
async function fetchSubscription(userId: string): Promise<ISubscriptionInfo | null> {
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
function getLatestBundleEpisode(episodes: Episode[]): Episode | null {
	if (episodes.length === 0) return null;

	const sorted = episodes.sort((a, b) => {
		const dateA = new Date(a.published_at || a.created_at).getTime();
		const dateB = new Date(b.published_at || b.created_at).getTime();
		return dateB - dateA;
	});

	return sorted[0] ?? null;
}
