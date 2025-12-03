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
import { RecentEpisodesList } from "@/components/dashboard/recent-episodes-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
	fetchBundleEpisodes,
	fetchSubscription,
	fetchUserCurationProfile,
	fetchUserEpisodes,
	getLatestBundleEpisode,
} from "@/lib/services/dashboard-service";
import { dashboardCopy } from "./content";

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
	const hasCurateControl =
		(subscription?.plan_type || "").toLowerCase() === "curate_control";
	const showCurateControlButton = hasCurateControl;

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
			<div className="flex flex-col md:flex-col xl:flex-row w-full   gap-4">
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
					<RecentEpisodesList
						episodes={userEpisodes}
						showCurateControlButton={showCurateControlButton}
					/>
				</Suspense>
			</div>
		</div>
	);
}
