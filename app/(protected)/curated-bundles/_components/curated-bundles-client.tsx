"use client";

import { AlertCircle, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import SectionHeader from "@/components/section-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { H3, Typography } from "@/components/ui/typography";
import { ONE_HOUR, SEVEN_DAYS } from "@/lib/swr";
import type { Bundle, Podcast } from "@/lib/types";
import { BundleSelectionDialog } from "./bundle-selection-dialog";

type BundleWithAccess = Bundle & {
	podcasts: Podcast[];
	canInteract?: boolean;
	lockReason?: string | null;
	bundleType?: "curated" | "shared";
	shared_bundle_id?: string;
	episodes?: Array<{
		episode_id: string;
		episode_title: string;
		duration_seconds: number | null;
	}>;
	episode_count?: number;
	owner?: {
		user_id: string;
		full_name: string;
	};
};

type NormalizedBundle = Bundle & {
	podcasts: Podcast[];
	canInteract: boolean;
	lockReason: string | null;
	bundleType: "curated" | "shared";
	shared_bundle_id?: string;
	episodes?: Array<{
		episode_id: string;
		episode_title: string;
		duration_seconds: number | null;
	}>;
	episode_count?: number;
	owner?: {
		user_id: string;
		full_name: string;
	};
};

type PlanGateValue = Bundle["min_plan"];

const PLAN_GATE_META = {
	NONE: {
		badgeLabel: "All plans",
		description: "Available on every Podslice plan.",
		statusLabel: "All plans",
	},
	FREE_SLICE: {
		badgeLabel: "Free Slice+",
		description: "Requires Free Slice plan or higher.",
		statusLabel: "Free Slice +",
	},
	CASUAL_LISTENER: {
		badgeLabel: "Casual Listener+",
		description: "Requires Casual Listener plan or higher.",
		statusLabel: "Casual Listener & Curate Control",
	},
	CURATE_CONTROL: {
		badgeLabel: "Curate Control",
		description: "Requires the Curate Control plan.",
		statusLabel: "Curate Control exclusive",
	},
} satisfies Record<
	PlanGateValue,
	{ badgeLabel: string; description: string; statusLabel: string }
>;

const normalizeBundle = (bundle: BundleWithAccess): NormalizedBundle => ({
	...bundle,
	canInteract: bundle.canInteract ?? true,
	lockReason: bundle.lockReason ?? null,
	bundleType: bundle.bundleType ?? "curated",
	shared_bundle_id: bundle.shared_bundle_id,
	episodes: bundle.episodes,
	episode_count: bundle.episode_count,
	owner: bundle.owner,
});

interface CuratedBundlesClientProps {
	bundles: BundleWithAccess[];
	error: string | null;
}

interface UserCurationProfile {
	profile_id: string;
	name: string;
	selected_bundle_id?: string;
	selected_shared_bundle_id?: string;
	selectedBundle?: {
		name: string;
	};
	selectedSharedBundle?: {
		name: string;
	};
}

interface BundleSelectionRequestBody {
	name?: string;
	isBundleSelection?: boolean;
	selected_bundle_id?: string;
	selected_shared_bundle_id?: string;
}

export function CuratedBundlesClient({ bundles, error }: CuratedBundlesClientProps) {
	const router = useRouter();
	const [bundleList, setBundleList] = useState<NormalizedBundle[]>(() =>
		bundles.map(normalizeBundle)
	);
	const [selectedBundle, setSelectedBundle] = useState<NormalizedBundle | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState<"select" | "locked">("select");
	const [isLoading, setIsLoading] = useState(false);
	const [failedBundleImages, setFailedBundleImages] = useState<Set<string>>(new Set());

	// SWR: Curated + shared bundles, 7-day client cache window
	const {
		data: swrBundles,
		isLoading: isFetchingBundles,
		mutate: mutateBundles,
	} = useSWR<BundleWithAccess[]>("/api/curated-bundles", {
		dedupingInterval: SEVEN_DAYS,
		revalidateOnFocus: false,
		revalidateIfStale: false,
	});

	// SWR: User profile, 1-hour cache window
	const { data: userProfile, mutate: mutateProfile } = useSWR<UserCurationProfile | null>(
		"/api/user-curation-profiles",
		{
			dedupingInterval: ONE_HOUR,
			revalidateOnFocus: false,
			revalidateIfStale: false,
		}
	);

	// Seed from server-rendered bundles first, then update from SWR when available
	useEffect(() => {
		setBundleList(bundles.map(normalizeBundle));
	}, [bundles]);

	useEffect(() => {
		if (Array.isArray(swrBundles)) {
			setBundleList(swrBundles.map(normalizeBundle));
		}
	}, [swrBundles]);

	const handleBundleClick = (bundle: NormalizedBundle) => {
		setSelectedBundle(bundle);
		setDialogMode(bundle.canInteract ? "select" : "locked");
		setIsDialogOpen(true);
	};

	const handleImageError = (bundleId: string) => {
		setFailedBundleImages(prev => new Set(prev).add(bundleId));
	};

	const handleConfirmSelection = async ({
		bundleId,
		profileName,
	}: {
		bundleId: string;
		profileName?: string;
		isShared?: boolean;
	}) => {
		if (selectedBundle && !selectedBundle.canInteract) {
			setIsDialogOpen(false);
			setSelectedBundle(null);
			setDialogMode("select");
			return;
		}

		// Determine if this is a shared bundle
		const isSelectingSharedBundle = selectedBundle?.bundleType === "shared";
		const actualBundleId = isSelectingSharedBundle
			? selectedBundle?.shared_bundle_id
			: bundleId;

		setIsLoading(true);
		try {
			if (!userProfile) {
				const trimmedProfileName = profileName?.trim();
				if (!trimmedProfileName) {
					throw new Error("PROFILE_NAME_REQUIRED");
				}

				// For new profile creation, we need to use the appropriate field
				const requestBody: BundleSelectionRequestBody = {
					name: trimmedProfileName,
					isBundleSelection: true,
				};

				if (isSelectingSharedBundle) {
					requestBody.selected_shared_bundle_id = actualBundleId;
				} else {
					requestBody.selected_bundle_id = actualBundleId;
				}

				const response = await fetch("/api/user-curation-profiles", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error || "Failed to create bundle profile");
				}

				const createdProfile: UserCurationProfile = await response.json();
				await mutateProfile(createdProfile, { revalidate: false });
				toast.success(
					isSelectingSharedBundle
						? "Shared bundle selected successfully!"
						: "Curated bundle selected successfully!"
				);
				router.push("/dashboard");
				return;
			}

			// For existing profile, send the appropriate field
			const requestBody: BundleSelectionRequestBody = {};
			if (isSelectingSharedBundle) {
				requestBody.selected_shared_bundle_id = actualBundleId;
			} else {
				requestBody.selected_bundle_id = actualBundleId;
			}

			const response = await fetch(
				`/api/user-curation-profiles/${userProfile.profile_id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || "Failed to update bundle selection");
			}

			await mutateProfile(
				prev =>
					prev
						? {
								...prev,
								...(isSelectingSharedBundle
									? { selected_shared_bundle_id: actualBundleId }
									: { selected_bundle_id: actualBundleId }),
								selectedBundle: {
									name: selectedBundle?.name || "",
								},
							}
						: null,
				{ revalidate: false }
			);

			toast.success(
				isSelectingSharedBundle
					? "Shared bundle selected successfully!"
					: "Bundle selection updated successfully!"
			);
			// Refresh bundles view opportunistically
			void mutateBundles();
			router.push("/dashboard");
		} catch (error) {
			console.error("Failed to update bundle selection:", error);
			const message =
				error instanceof Error ? error.message : "Failed to update bundle selection";
			if (message !== "PROFILE_NAME_REQUIRED") {
				toast.error(message);
			}
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const handleCloseDialog = () => {
		setIsDialogOpen(false);
		setSelectedBundle(null);
		setDialogMode("select");
	};

	if (error) {
		return (
			<div className="max-w-4xl mx-auto mt-8 ">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Unable to Load PODSLICE Bundles</AlertTitle>
					<AlertDescription className="mt-2">{error}</AlertDescription>
				</Alert>
				<div className="mt-6 text-center">
					<Button asChild variant="outline">
						<Link href="/curated-bundles">Try Again</Link>
					</Button>
				</div>
			</div>
		);
	}

	if (isFetchingBundles) {
		return (
			<div className="mb-8">
				<div className="h-8 w-64 bg-[#2f4383]/30 animate-pulse rounded mb-4 px-2 md:px-12 xl:px-[40px]" />
				<div className="relative transition-all duration-200 text-card-foreground p-0 px-2 md:px-12 w-full overflow-y-scroll z-1 grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 xl:grid-cols-3 xl:px-[40px] xl:justify-around items-start xl:gap-6 md:gap-4 h-fit episode-card-wrapper-dark lg:p-[40px] rounded-3xl border-1 border-[#513f8bfc] shadow-[0px_0px_5px_5px_#261c4b5b] backdrop-blur-[3px]">
					<div className="bg-[#2f4383]/40 h-[500px] w-full animate-pulse rounded-lg" />
					<div className="bg-[#2f4383]/40 h-[500px] w-full animate-pulse rounded-lg" />
					<div className="bg-[#2f4383]/40 h-[500px] w-full animate-pulse rounded-lg" />
					<div className="bg-[#2f4383]/30 h-[500px] w-full animate-pulse rounded-lg" />
				</div>
			</div>
		);
	}

	// Separate bundles by type
	const curatedBundles = bundleList.filter(b => b.bundleType === "curated");
	const sharedBundles = bundleList.filter(b => b.bundleType === "shared");
	if (curatedBundles.length === 0) {
		return (
			<div className="max-4xl mx-auto mt-8 ">
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>No PODSLICE Bundles Available</AlertTitle>
					<AlertDescription className="mt-2">
						There are no PODSLICE Bundles available at the moment. Please check back later
						or contact support if this problem persists.
					</AlertDescription>
				</Alert>
			</div>
		);
	}
	return (
		<>
			{/* Curated Bundles Section */}

			{curatedBundles.length > 0 && (
				<div className=" mb-8 px-4">
					<SectionHeader
						title="Subscribe to a Channel"
						description="Subscribe to channels. New audio and text summaries will appear in your feed automatically weekly or daily"
					/>
					<div className="episode-card-wrapper-dark relative transition-all duration-200 text-card-foreground gap-4 p-0 px-2 md:px-4 md:py-5 w-full overflow-y-scroll z-1 grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 xl:grid-cols-3 xl:p-[40px]   lg:px-8 xl:justify-evenly items-start lg:gap-5 xl:gap-6 h-fit xl:px-[40px] rounded-3xl  backdrop-blur-[3px]">
						{curatedBundles.map(bundle => {
							const planMeta = PLAN_GATE_META[bundle.min_plan];
							const canInteract = bundle.canInteract;
							const isShared = bundle.bundleType === "shared";

							return (
								<Card key={bundle.bundle_id} onClick={() => handleBundleClick(bundle)}>
									<CardHeader className="w-full py-4 px-2">
										<div className="w-full flex flex-col-reverse xl:flex-col-reverse gap-3">
											<div className="flex items-start gap-3 text-sm font-normal tracking-wide flex-col w-full">
												<H3 className="text-lg text-primary-foreground  font-foreground-muted font-sans mt-2  tracking-tight uppercase leading-tight mb-0 truncate">
													{bundle.name}
												</H3>

												<div className="flex flex-wrap items-center gap-2">
													{isShared ? (
														<Badge
															variant="outline"
															className="uppercase tracking-wide text-[0.6rem] font-semibold px-2 py-0.5  text-primary-foreground-muted  border-bundle-card-border">
															🎁 Shared Bundle
														</Badge>
													) : (
														<Badge
															variant="secondary"
															className="hidden uppercase tracking-wide text-[0.6rem] font-semibold px-2 py-0.5">
															{planMeta.badgeLabel}
														</Badge>
													)}
													{canInteract ? (
														<Badge
															variant="outline"
															className="text-secondary-foreground
                             border-1  border-sidebar bg-emerald-500/0 text-[0.6rem] font-semibold px-2 py-0.5">
															{planMeta.statusLabel}
														</Badge>
													) : (
														<Badge
															variant="destructive"
															className="text-[0.6rem] font-semibold px-2 py-0.5">
															Upgrade required
														</Badge>
													)}
												</div>

												<Badge variant="secondary" className="font-normal tracking-wide">
													<Lock size={8} className="mr-2" />
													<Typography className="text-xxs">Podslice Bundle</Typography>
												</Badge>
												{isShared && bundle.owner && (
													<Typography className="text-[0.65rem] text-[#ffecece7] font-normal leading-tight mt-0 mb-0">
														Shared by {bundle.owner.full_name}
													</Typography>
												)}
												<Typography className="text-[0.8rem] text-primary-foreground font-bold leading-tight mt-0 mb-0 line-clamp-3">
													{isShared ? "Episodes in bundle:" : "featuring:"}
												</Typography>
												<div className="mx-auto w-full">
													{isShared ? (
														bundle.episodes?.slice(0, 4).map(episode => (
															<li key={episode.episode_id} className=" leading-none">
																<div className="w-full flex flex-col gap-0 ">
																	<p className="w-full text-[0.75rem] font-semibold leading-normal my-0 px-1 mx-0 text-left text-primary-foreground/80 tracking-wide line-clamp-1 truncate ">
																		{episode.episode_title}
																	</p>
																</div>
															</li>
														))
													) : (
														<ul
															key={bundle.bundle_id}
															className="bg-header/90 min-w-full rounded-md w-full flex flex-row flex-wrap  py-2 px-1 gap-2 capitalize">
															{bundle.podcasts
																.slice(0, 4)
																.map((podcast: Podcast, _index: number) => (
																	<li
																		key={podcast.podcast_id}
																		className="text-foreground leading-none font-medium text-[0.75rem] truncate pl-1 line-clamp-1">
																		{podcast.name}
																	</li>
																))}
															{bundle.podcasts.length > 4 && (
																<span className="text-[0.7rem] text-primary-foreground font-bold leading-tight mt-0 mb-0 ">
																	and more
																</span>
															)}
														</ul>
													)}
												</div>
											</div>

											<div className="flex items-start gap-2 text-sm font-normal tracking-wide w-full">
												<div className="relative my-2 border-2  border-amber-300 rounded-lg outline-0 overflow-hidden w-full min-w-[200px] h-fit lg:h-fit xl:h-fit xl:justify-end">
													{!failedBundleImages.has(bundle?.bundle_id || "") &&
													bundle?.bundle_id ? (
														<img
															className="w-full object-cover"
															src={`/api/bundles/${bundle.bundle_id}/image`}
															alt={bundle.name}
															width={190}
															height={110}
															style={{ width: "100%", height: "auto" }}
															onError={() => handleImageError(bundle.bundle_id || "")}
														/>
													) : (
														<div className="w-full h-[110px] bg-muted flex items-center justify-center">
															<img
																src="/generic-news-placeholder2.png"
																alt={bundle.name}
																className="w-full h-full object-cover"
															/>
														</div>
													)}
												</div>
											</div>
										</div>
									</CardHeader>
								</Card>
							);
						})}
					</div>
				</div>
			)}

			{/* Shared Bundles Section */}
			{sharedBundles.length > 0 && (
				<div className="mb-8">
					<H3 className="text-[1.2rem] text-[#d1a7e7] font-bold font-sans mb-4 px-2 md:px-12 xl:px-[40px]">
						🎁 Shared by Community
					</H3>
					<div className="relative transition-all duration-200 text-card-foreground p-0 px-2 md:px-12 w-full overflow-y-scroll z-1 grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 xl:grid-cols-2 xl:px-[40px] xl:justify-around items-start xl:gap-6 md:gap-4 h-fit episode-card-wrapper-dark  lg:px-[40px] rounded-3xl border-1 border-[#a497cdfc] backdrop-blur-[3px]">
						{sharedBundles.map(bundle => {
							const planMeta = PLAN_GATE_META[bundle.min_plan];
							const canInteract = bundle.canInteract;
							const isShared = bundle.bundleType === "shared";

							return (
								<Card key={bundle.bundle_id} onClick={() => handleBundleClick(bundle)}>
									<CardHeader className="w-full">
										<div className="w-full flex flex-col-reverse xl:flex-col-reverse gap-6">
											<div className="flex items-start gap-3 text-sm font-normal tracking-wide flex-col w-full md:max-w-[240px]">
												<H3 className="text-[0.8rem] text-primary-foreground-muted font-sans mt-2 text-shadow-sm tracking-tight uppercase leading-tight mb-0 truncate">
													{bundle.name}
												</H3>

												<div className="flex flex-wrap items-center gap-2">
													{isShared ? (
														<Badge
															variant="outline"
															className="uppercase tracking-wide text-[0.6rem] font-semibold px-2 py-0.5 bg-purple-500/20 border-purple-400">
															🎁 Shared Bundle
														</Badge>
													) : (
														<Badge
															variant="outline"
															className="uppercase tracking-wide text-[0.6rem] font-semibold px-2 py-0.5">
															{planMeta.badgeLabel}
														</Badge>
													)}
													{canInteract ? (
														<Badge
															variant="outline"
															className="text-emerald-300 border-emerald-500/60 bg-emerald-500/10 text-[0.6rem] font-semibold px-2 py-0.5">
															{planMeta.statusLabel}
														</Badge>
													) : (
														<Badge
															variant="destructive"
															className="text-[0.6rem] font-semibold px-2 py-0.5">
															Upgrade required
														</Badge>
													)}
												</div>

												<Badge variant="outline" className="font-normal tracking-wide">
													<Lock size={8} className="mr-2" />
													<Typography className="text-xxs">Fixed Selection</Typography>
												</Badge>
												{isShared && bundle.owner && (
													<Typography className="text-[0.65rem] text-[#f1e9e9b3] font-normal leading-tight mt-0 mb-0">
														Shared by {bundle.owner.full_name}
													</Typography>
												)}
												<Typography className="text-[0.7rem] text-[#f1e9e9b3] font-normal leading-tight mt-0 mb-0 line-clamp-3">
													{isShared ? "Episodes in bundle:" : "Included in bundle:"}
												</Typography>
												<CardContent className=" mx-auto rounded-md w-full m-0">
													<ul className="list-none px-2 m-0 flex flex-col gap-0 py-1">
														{isShared ? (
															<>
																{bundle.episodes?.slice(0, 4).map(episode => (
																	<li
																		key={episode.episode_id}
																		className=" leading-none flex w-full justify-end gap-0 p-0">
																		<div className="w-full flex flex-col gap-0 ">
																			<p className="w-full text-[0.7rem] font-semibold leading-normal my-0 px-1 mx-0 text-left text-[#e9f0f1b3] tracking-wide line-clamp-2">
																				{episode.episode_title}
																			</p>
																		</div>
																	</li>
																))}
																{(bundle.episode_count ?? 0) > 4 && (
																	<span className="text-[0.8rem] text-primary-foreground font-bold leading-tight mt-0 mb-0 line-clamp-3 pl-1">
																		+{(bundle.episode_count ?? 0) - 4} more
																	</span>
																)}
															</>
														) : (
															<>
																{bundle.podcasts.slice(0, 4).map((podcast: Podcast) => (
																	<li
																		key={podcast.podcast_id}
																		className=" leading-none flex w-full justify-end gap-0 p-0">
																		<div className="w-full flex flex-col gap-0">
																			<p className="w-full text-[0.5rem] font-semibold leading-normal my-0 px-1 mx-0 text-left text-[#e9f0f1b3] tracking-wide line-clamp-2">
																				{podcast.name}
																			</p>
																		</div>
																	</li>
																))}
																{bundle.podcasts.length > 4 && (
																	<span className="text-[0.8rem] text-primary-foreground font-bold leading-tight mt-0 mb-0 line-clamp-3 pl-1">
																		and more
																	</span>
																)}
															</>
														)}
													</ul>
												</CardContent>
											</div>

											<div className="flex items-start gap-2 text-sm font-normal tracking-wide w-full">
												<div className="relative my-2 rounded-lg outline-2 overflow-hidden w-full min-w-[200px] h-fit lg:h-fit xl:h-fit xl:justify-end">
													{!failedBundleImages.has(bundle?.bundle_id || "") &&
													bundle?.bundle_id ? (
														<img
															className="w-full object-cover"
															src={`/api/bundles/${bundle.bundle_id}/image`}
															alt={bundle.name}
															style={{ width: "100%", height: "auto" }}
															onError={() => handleImageError(bundle.bundle_id || "")}
														/>
													) : (
														<div className="w-full h-[110px] bg-muted flex items-center justify-center">
															<img
																src="/generic-news-placeholder2.png"
																alt={bundle.name}
																className="w-full h-full object-cover"
															/>
														</div>
													)}
												</div>
											</div>
										</div>
									</CardHeader>
								</Card>
							);
						})}
					</div>
				</div>
			)}

			<BundleSelectionDialog
				isOpen={isDialogOpen}
				onClose={handleCloseDialog}
				onConfirm={handleConfirmSelection}
				mode={dialogMode}
				requiresProfileCreation={!userProfile}
				selectedBundle={selectedBundle}
				// Pass the currently selected bundle info based on type
				currentCuratedBundleName={userProfile?.selectedBundle?.name}
				currentCuratedBundleId={userProfile?.selected_bundle_id}
				currentSharedBundleName={userProfile?.selectedSharedBundle?.name}
				currentSharedBundleId={userProfile?.selected_shared_bundle_id}
				isLoading={isLoading}
				lockReason={selectedBundle?.lockReason}
				requiredPlanLabel={
					selectedBundle ? PLAN_GATE_META[selectedBundle.min_plan].badgeLabel : undefined
				}
				requiredPlanDescription={
					selectedBundle ? PLAN_GATE_META[selectedBundle.min_plan].description : undefined
				}
			/>
		</>
	);
}
