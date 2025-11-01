"use client";
import { Edit, Podcast, UserIcon } from "lucide-react";
import { dashboardCopy } from "@/app/(protected)/dashboard/content";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
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
		<div className="rounded-xl w-screen md:w-full pt-0 md:pr-0 md:mr-0 flex flex-col lg:flex-col lg:justify-center lg:items-center md:p-1 sm:pt-0 md:pt-6  p-0 m-0 mx-auto md:mx-0 md:overflow-hidden lg:w-full lg:gap-1 overflow-hidden mt-8 mb-4 md:mt-0 max-h-300 max-w-full">
			<div className="px-0 lg:gap-2 flex flex-col md:justify-between md:p-0 md:rounded-none w-full">
				<h2 className="pt-8 font-bold md:text-secondary-foreground md:pt-0 md:px-0 py-4 text-base  md:block">
					{sections.bundleFeed.title}
				</h2>
				<div className="md:rounded-2xl">
					<div className="md:border-1 bg-sidebar shadow-indigo-800/90 md:shadow-none border border-border  py-6 md:pt-4 md:pb-0 px-2 shadow-lg rounded-t-lg text-secondary-foreground md:text-primary-foreground">
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
							<p className="text-[0.65rem] w-full uppercase tracking-wide font-mono font-bold text-primary-foreground-muted md:text-primary-foreground-muted  md:not-italic p-0 mb-2">
								{sections.bundleFeed.activeBundleLabel}
							</p>

							<div className="bg-card flex  py-2 px-3 md:px-2 md:py-1 md:rounded-sm border-1 border-sidebar-border/50 shadow-sm shadow-indigo-950/90 rounded-md gap-3">
								<Typography className="flex w-full text-sm font-bold items-center gap-2">
									<Podcast
										size={16}
										className="text-ring md:text-accent-foreground text-2xl"
									/>
									<span
										className="Your Content Profile:

">
										{/*{userCurationProfile.selectedBundle?.name}*/}
										Active Channel Overview:
									</span>
								</Typography>
							</div>
						</div>
					</div>

					<div className=" md:inline mt-0 w-full">
						<div className="bg-[#393247]/30 border-t-0 overflow-hidden rounded-b-md border-1 border-[#51516500] px-0 p-0">
							<div className="flex flex-col justify-start gap-2 items-start my-2 px-0 w-full border-1 border-gray-800/30 rounded-md overflow-hidden pt-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="text-foreground/60" colSpan={3}>
												Active Channel:
											</TableHead>
											<TableHead className="text-right uppercase font-black">
												{userCurationProfile.selectedBundle?.name}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{/*{sections.bundleFeed.map(invoice => (*/}

										<TableRow>
											<TableCell colSpan={3} className="font-medium text-foreground/60">
												{sections.bundleFeed.summaryLabel}
											</TableCell>

											<TableCell className="text-right font-mono">
												{" "}
												{bundleEpisodes?.length || 0}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell colSpan={3} className="font-medium text-foreground/60">
												{sections.bundleFeed.planLabel}
											</TableCell>

											<TableCell className="text-right capitalize">
												{getPlanDisplay()}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</div>
						</div>
					</div>
					<div className=" md:inline mt-0 w-full">
						<div className="mb-4 flex flex-col">
							<p className="text-[0.65rem] w-full uppercase mt-4  font-mono font-bold text-primary-foreground-muted md:text-primary-foreground-muted  md:not-italic p-0 mb-2">
								{sections.bundleFeed.personalFeedLabel}
							</p>

							<div className="bg-card flex  py-2 px-3 md:px-2 md:py-1 md:rounded-sm border-1 border-sidebar-border/50 shadow-sm shadow-indigo-950/90 rounded-md gap-3">
								<Typography className="flex w-full text-sm font-bold items-center gap-2">
									<UserIcon size={16} className="text-ring md:text-accent-foreground" />
									<span className="text-sm text-foreground gap-3 font-sans text-left font-bold">
										{sections.bundleFeed.pesdonalFeedTitle}
									</span>
								</Typography>
							</div>
						</div>{" "}
						<div className="bg-[#393247]/40 border-t-0 overflow-hidden rounded-md border-1 border-[#51516500] px-0 p-0">
							<div className="flex flex-col justify-start gap-2 items-start my-2 px-0 w-full border-0  border-gray-800/30 rounded-md overflow-hidden pt-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead colSpan={3} className="text-foreground/60">
												{" "}
												Summary Usage:
												{/*{sections.bundleFeed.activeBundleLabel}*/}
											</TableHead>
											<TableHead className="text-right uppercase font-mono">
												10
												<span className="font-bold">/20</span>
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{/*{sections.bundleFeed.map(invoice => (*/}

										<TableRow>
											<TableCell colSpan={3} className="font-medium text-foreground/60">
												Shared Summmaries:
											</TableCell>

											<TableCell className="text-right font-mono">
												{" "}
												{bundleEpisodes?.length || 0}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell
												colSpan={3}
												className="font-medium capitalize text-foreground/60">
												{sections.bundleFeed.planLabel}
											</TableCell>

											<TableCell className="text-right capitalize">
												{getPlanDisplay()}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
