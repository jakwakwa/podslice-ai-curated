"use client";

import { BoxesIcon, Edit } from "lucide-react";
import { dashboardCopy } from "@/app/(protected)/dashboard/content";
import { Button } from "@/components/ui/button";
import { Body, Typography } from "@/components/ui/typography";
import type { Episode, UserCurationProfileWithRelations } from "@/lib/types";

interface SubscriptionInfo {
	plan_type: string;
	status: string;
}

interface BundleSummaryPanelProps {
	userCurationProfile: UserCurationProfileWithRelations;
	subscription: SubscriptionInfo | null;
	onUpdateBundle: () => void;
	bundleEpisodes?: Episode[];
}

/**
 * BundleSummaryPanel
 * Displays the user's active bundle selection with summary stats and update button
 */
export function BundleSummaryPanel({
	userCurationProfile,
	subscription,
	onUpdateBundle,
	bundleEpisodes = [],
}: BundleSummaryPanelProps) {
	const { sections } = dashboardCopy;

	const hasValidBundle =
		userCurationProfile?.is_bundle_selection && userCurationProfile?.selectedBundle;
	if (!hasValidBundle) {
		return null;
	}

	const getPlanDisplay = () => {
		const plan = (subscription?.plan_type || "").toLowerCase();
		const status = (subscription?.status || "").toLowerCase();
		if (!plan) return "n/a";
		const label = plan.replace(/_/g, " ");
		const inactive = !(
			status === "active" ||
			status === "trialing" ||
			status === "paused"
		);
		return inactive ? `${label} (expired)` : label;
	};

	return (
		<div className="rounded-xl w-screen md:w-full pt-0 md:pr-0 md:mr-0 flex flex-col lg:flex-col lg:justify-center lg:items-center md:p-1 sm:pt-0 md:pt-6  p-0 m-0 mx-auto md:mx-0 md:overflow-hidden lg:w-full lg:gap-1 overflow-hidden mt-8 mb-4 md:mt-0 max-h-120">
			<div className="px-0 lg:gap-2 flex flex-col md:justify-between md:p-0 md:rounded-none w-full">
				<h2 className="pt-8 font-bold md:text-secondary-foreground md:pt-0 md:px-0 pb-3 text-sm max-w-[100%] md:block">
					{sections.bundleFeed.title}
				</h2>
				<div className="md:rounded-2xl">
					<div className="md:border-1 bg-sidebar shadow-indigo-800/90 md:shadow-none border border-border  py-6 md:pt-4 md:pb-0 px-2 h-fit shadow-lg md:rounded-t-lg text-secondary-foreground md:text-primary-foreground">
						<Button
							className="inline-flex text-sm md:text-xs justify-end w-full px-0 mb-2 text-foreground"
							variant="ghost"
							size="xs"
							onClick={onUpdateBundle}
							aria-label="Update bundle selection">
							<Edit className="text-ring" />
							{sections.bundleFeed.updateButton}
						</Button>
						<div className="mb-4 flex flex-col">
							<p className="text-xs w-full uppercase font-sans font-bold text-primary-foreground-muted md:text-primary-foreground-muted  md:not-italic p-0 mb-2">
								{sections.bundleFeed.activeBundleLabel}
							</p>

							<div className="bg-card flex  py-8 px-3 md:px-2 md:py-1 md:rounded-sm border-1 border-sidebar-border/50 shadow-sm shadow-indigo-950/90 rounded-md gap-3">
								<Typography className="flex w-full font-bold items-center gap-2">
									<BoxesIcon
										size={16}
										className="text-ring md:text-accent-foreground text-2xl"
									/>
									<span className="text-base text-foreground gap-3 font-sans text-left font-bold">
										{userCurationProfile.selectedBundle?.name}
									</span>
								</Typography>
							</div>
						</div>
					</div>

					<div className=" md:inline mt-0 w-full">
						<div className="bg-[#393247]/30 border-t-0 overflow-hidden rounded-b-2xl border-1 border-[#51516500] px-0 p-0">
							<Body className="pt-0 pl-2 text-foreground/90 uppercase font-bold font-sans text-[10px]">
								{sections.bundleFeed.summaryLabel}
							</Body>
							<div className="flex flex-col justify-start gap-2 items-start my-2 px-0 w-full border-1 border-gray-800/30 rounded-md overflow-hidden pt-0">
								<div className="flex flex-row justify-between gap-1 items-center h-9 w-full bg-black/10 py-3 px-2">
									<span className="font-sans text-blue-200 text-xs">
										{sections.bundleFeed.bundledEpisodesLabel}
									</span>
									<span className="uppercase left text-blue-300/90 text-[0.7rem] font-mono font-medium">
										{bundleEpisodes?.length || 0}
									</span>
								</div>

								<div className="flex flex-row justify-between gap-2 items-center h-5 w-full py-3 px-2">
									<span className="text-primary text-xs font-medium font-sans">
										{sections.bundleFeed.planLabel}
									</span>
									<span className="uppercase text-[0.7rem] w-full left text-indigo-200/80 font-sans">
										{getPlanDisplay()}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
