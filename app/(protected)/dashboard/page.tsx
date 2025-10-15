"use client";

import { AlertCircle, BoxesIcon, Edit } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import EditUserFeedModal from "@/components/edit-user-feed-modal";
import { PlayButton } from "@/components/episodes/play-button";
import UserFeedSelector from "@/components/features/user-feed-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EpisodeCard from "@/components/ui/episode-card";
import { PageHeader } from "@/components/ui/page-header";
import { Body, Typography } from "@/components/ui/typography";
import { useEpisodePlayer } from "@/hooks/use-episode-player";
import { useUserCurationProfileStore } from "@/lib/stores";
import type { Episode, UserCurationProfile, UserCurationProfileWithRelations, UserEpisode } from "@/lib/types";

interface SubscriptionInfo {
	plan_type: string;
	status: string;
}

export default function CurationProfileManagementPage() {
	const [userCurationProfile, setUserCurationProfile] = useState<UserCurationProfileWithRelations | null>(null);
	const [_episodes, setEpisodes] = useState<Episode[]>([]);
	const [bundleEpisodes, setBundleEpisodes] = useState<Episode[]>([]);
	const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);

	type UserEpisodeWithSignedUrl = UserEpisode & { signedAudioUrl: string | null };
	const [userEpisodes, setUserEpisodes] = useState<UserEpisodeWithSignedUrl[]>([]);
	const { playEpisode } = useEpisodePlayer();

	const fetchAndUpdateData = useCallback(async () => {
		try {
			// Fetch user curation profile, catalog episodes, user episodes and subscription in parallel
			const [profileResponse, episodesResponse, userEpisodesResponse, subscriptionResponse] = await Promise.all([
				fetch("/api/user-curation-profiles"),
				fetch("/api/episodes"),
				fetch("/api/user-episodes/list"),
				fetch("/api/account/subscription"),
			]);

			const fetchedProfile = profileResponse.ok ? await profileResponse.json() : null;
			const fetchedEpisodes = episodesResponse.ok ? await episodesResponse.json() : [];
			const fetchedUserEpisodes: UserEpisodeWithSignedUrl[] = userEpisodesResponse.ok ? await userEpisodesResponse.json() : [];
			// Handle 204 No Content for subscription endpoint without attempting to parse JSON
			let fetchedSubscription: SubscriptionInfo | null = null;
			if (subscriptionResponse.status === 204) {
				fetchedSubscription = null;
			} else if (subscriptionResponse.ok) {
				try {
					fetchedSubscription = await subscriptionResponse.json();
				} catch {
					fetchedSubscription = null;
				}
			}

			setUserCurationProfile(fetchedProfile);
			setEpisodes(fetchedEpisodes);
			setUserEpisodes(fetchedUserEpisodes);
			setSubscription(fetchedSubscription);

			// Get bundle episodes if user has a bundle selection
			let bundleEpisodesList: Episode[] = [];
			if (fetchedProfile?.is_bundle_selection && fetchedProfile?.selectedBundle?.episodes) {
				bundleEpisodesList = fetchedProfile.selectedBundle.episodes;
			}
			setBundleEpisodes(bundleEpisodesList);
		} catch (error) {
			console.error("Failed to fetch data:", error);
		}
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setIsLoading(true);
				await fetchAndUpdateData();
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				toast.error(`Failed to load profile data: ${message}`);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [fetchAndUpdateData]);

	const handleSaveUserCurationProfile = async (updatedData: Partial<UserCurationProfile>) => {
		if (!userCurationProfile) return;
		try {
			const response = await fetch(`/api/user-curation-profiles/${userCurationProfile.profile_id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedData),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || errorData.message || "Failed to update user curation profile");
			}
			// Refetch data after successful update to show new bundle selection
			await fetchAndUpdateData();

			toast.success("Weekly Bundled Feed updated successfully!");
			setIsModalOpen(false);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			toast.error(`Failed to update Personalized Feed: ${message}`);
		}
	};

	// Get the latest bundle episode
	const latestBundleEpisode =
		bundleEpisodes.length > 0 ? bundleEpisodes.sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())[0] : null;

	return (
		<div className="bg-episode-card-wrapper h-full min-h-[84vh]  rounded-none 	px-0  mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl  md:mt-0 md:p-8 md:w-full  md:bg-episode-card-wrapper ">
			<PageHeader
				title="Your dashboard"
				description="This is your dashboard. Here you can manage your bundle selection and view your recently generated episodes."
			/>
			{/* BUNDLE FEED */}
			{isLoading ? (
				<div className=" w-full flex flex-col gap-0 justify-center items-baseline shadow-md shadow-stone-950/20  mt-0 md:mt-4 md:m-0 xl:flex-row md:gap-4 pt-0 md:mb-0  border-1 md:bg-[#2F438335]/40 md:rounded-3xl overflow-hidden ">
					<div className="w-full pt-0 mt-0 flex flex-col lg:flex-row">
						{/* FEED BOX SKELETON */}
						<div className="w-full pt-0 pr-4 mt-0 md:mr-3 flex flex-col  md:bg-lg:flex-col md:p-8 sm:pt-0 md:pt-9 md:mt-0  md:max-w-[280px]   md:bg-[#131621]/0 overflow-hidden ">
							<div className="w-full flex flex-col justify-between p-0 rounded-2xl ">
								<div className="w-[90%] mx-4 mt-8  md:w-48 pt-8 md:pt-0 md:px-0 md:pb-3 md:h-6  bg-[#2f4383]/30 animate-pulse rounded" />
								<div className="w-2/3 mx-4 h-12 mt-2  md:hidden md:pb-3 md:h-6  bg-[#2f4383]/30 animate-pulse rounded" />
								<div className="w-1/3 mx-4 h-12  mt-2 md:hidden md:pb-3 md:h-6  bg-[#2f4383]/30 animate-pulse rounded" />
								<div className="w-1/3 mx-4  h-12 md:hidden md:pb-3 md:h-6  bg-[#2f4383]/30 animate-pulse rounded" />
								<div className="md:bg-[#262b3f67]/50 border-b-0  border-0 md:border-[#0e0d0da9] mx-auto px-5 w-full h-fit  rounded-t-lg overflow-hidden">
									<div className="h-8 w-24 ml-0 md:bg-[#2f4383]/0 animate-pulse rounded my-2" />
									<div className="mb-4 flex flex-col">
										<div className="h-4 w-32 md:bg-[#2F438335]/30 animate-pulse rounded mb-2" />
										<div className="flex w-full px-2 md:px-2 py-1 md:border-[#d4b1e125] rounded md:border-1 gap-3">
											<div className="h-6 w-full md:bg-[#2f4383]/30 animate-pulse rounded" />
										</div>
									</div>
								</div>
							</div>
							<div className="mt-0 w-full overflow-hidden shadow-md">
								<div className="md:bg-[#2F438335]/30 border-t-0 overflow-hidden rounded-b-2xl border-1 px-4 p-4">
									<div className="h-4 w-20 md:bg-[#2F438335]/30 animate-pulse rounded mb-2" />
									<div className="flex flex-col justify-start gap-2 items-start my-2 px-0 w-full md:border-1 md:border-gray-800 rounded-md overflow-hidden pt-0">
										<div className="flex flex-row justify-between gap-1 items-center h-9 w-full md:bg-black/10 py-3 px-2">
											<div className="h-4 w-32 md:bg-[#2F438335]/30 animate-pulse rounded" />
											<div className="h-4 w-8 md:bg-[#2F438335]/30 animate-pulse rounded" />
										</div>
										<div className="flex flex-row justify-between gap-2 items-center h-5 w-full py-3 px-2">
											<div className="h-4 w-16 md:bg-[#2F438335]/30 animate-pulse rounded" />
											<div className="h-4 w-24 md:bg-[#2F438335]/30 animate-pulse rounded" />
										</div>
									</div>
								</div>
							</div>
						</div>
						{/* Latest Episode SKELETON */}
						<div className="w-full border-b-0 hidden rounded-0 py-0  my-0 mx-0  mt-0 pt-6 px-4 sm:pt-0  md:pt-9 md:mt-0  md:mb-8  md:px-6 border-dark md:rounded-3xl overflow-hidden  ">
							<div className="h-7 w-64 md:bg-[#2F438335]/30 animate-pulse rounded mb-4" />
							<div className="h-5 w-full md:bg-[#2F438335]/30 animate-pulse rounded mb-6" />
							<div className="px-0">
								<div className="md:bg-[#2F438335]/30 h-[130px] w-full animate-pulse rounded-lg" />
							</div>
						</div>
					</div>
				</div>
			) : userCurationProfile && latestBundleEpisode ? (
				<div className="md:bg-bigcard  visible px-6  mt-0 w-full max-w-screen md:w-full flex flex-col gap-0 justify-center items-baseline shadow-md shadow-stone-950 md:mt-4 md:m-0 xl:flex-row md:gap-1 pt-0 md:mb-0 md:border-[#12121760]  md:border-1 md:rounded-3xl overflow-hidden rounded-lg  ">
					<div className=" md:flex w-full pt-0 mt-0 flex-col lg:flex-row rounded-lg   ">
						{/* FEED BOX */}
						<div className="rounded-xl w-screen md:w-full pt-0 md:pr-0 md:mr-0 flex flex-col  lg:flex-col lg:justify-center lg:items-center  md:p-8 sm:pt-0 md:pt-6 max-w-[87vw] p-0  m-0  mx-auto md:mx-0 md:overflow-hidden  lg:max-w-[249px] lg:gap-12 overflow-hidden mt-8 mb-4 md:mt-0  ">
							<div className="px-0  lg:gap-2 md:w-full flex flex-col md:justify-between md:p-0 md:rounded-none ">
								<h2 className=" pt-8  font-bold md:text-secondary-foreground md:pt-0 md:px-0  pb-3 text-sm max-w-[100%] hidden md:block ">Your Active Bundle Feed</h2>
								<div className=" md:rounded-2xl">
									{userCurationProfile?.is_bundle_selection && userCurationProfile?.selectedBundle && (
										<div className=" md:border-1 bg-sidebar    shadow-indigo-800/90 md:shadow-none     border border-border mx-auto  py-6  md:pt-4 md:pb-0 px-5 w-full h-fit shadow-lg  md:rounded-t-lg text-secondary-foreground md:text-primary-foreground ">
											<Button className="inline-flex text-sm md:text-xs justify-end w-full px-0 mb-2 text-foreground" variant="ghost" size="xs" onClick={() => setIsModalOpen(true)}>
												<Edit className="text-ring" />
												Update Bundle
											</Button>
											<div className="mb-4 flex flex-col">
												<p className="text-xs  w-full uppercase font-sans font-bold text-primary-foreground-muted md:text-secondary-foreground-muted  md:not-italic p-0 mb-2  ">Your Active bundle:</p>

												<div className="bg-card flex w-full py-8 px-3 md:px-2 md:py-1 md:rounded-sm border-1 border-sidebar-border/50 shadow-sm shadow-indigo-950/90 rounded-md gap-3 ">
													<Typography className="flex w-full  font-bold items-center gap-2">
														<BoxesIcon size={16} className="text-ring md:text-accent-foreground text-2xl " />
														<span className="text-base  text-foreground   gap-3 font-sans  text-left font-bold">
															{userCurationProfile.selectedBundle.name}
														</span>
													</Typography>
												</div>
											</div>
										</div>
									)}

									<div className="hidden md:inline mt-0 w-full ">
										<div className="bg-[#393247]/30 border-t-0 overflow-hidden rounded-b-2xl border-1 border-[#51516500] px-4 p-4">
											<Body className="pt-0 pl-2 text-foreground/90 uppercase font-bold font-sans text-[10px]"> Summary</Body>
											<div className="flex flex-col justify-start gap-2 items-start my-2 px-0 w-full border-1 border-gray-800/30 rounded-md overflow-hidden pt-0">
												<div className="flex flex-row justify-between gap-1 items-center h-9 w-full bg-black/10 py-3 px-2">
													<span className="font-sans text-blue-200 text-xs">Bundled Episodes:</span>
													<span className="uppercase left text-blue-300/90 text-[0.7rem] font-mono font-medium ">{userCurationProfile?.selectedBundle?.episodes?.length || 0}</span>
												</div>

												<div className="flex flex-row justify-between gap-2 items-center h-5 w-full py-3 px-2">
													<span className="text-primary text-xs font-medium font-sans">Plan:</span>
													<span className="uppercase text-[0.7rem] w-full left text-indigo-200/80 font-sans">
														{(() => {
															const plan = (subscription?.plan_type || "").toLowerCase();
															const status = (subscription?.status || "").toLowerCase();
															if (!plan) return "n/a";
															const label = plan.replace(/_/g, " ");
															const inactive = !(status === "active" || status === "trialing" || status === "paused");
															return inactive ? `${label} (expired)` : label;
														})()}
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						{/* Latest Bundle Episode Section */}
						<div className="w-full border-b-0 rounded-0 py-0  my-0 mx-0 border-[#2c2a2a17] mt-0 pt-6 px-4 sm:pt-0  md:pt-9 md:mt-0  md:mb-8  md:px-6 border-dark md:rounded-3xl overflow-hidden  ">
							<h3 className="flex flex-col font-bold w-full  mb-4 md:flex-row items-start  text-sm md:text-lg gap-2 text-secondary-foreground ">
								<span className="bg-[#1ca896]  font-medium  text-xs rounded-sm shadow-md shadow-[#53998e91]  animate-bounce ease-in-out  text-[0.65rem]duration-200 lg:text-xs px-2 py-1  mr-2 text-[#fff]/80">New</span>
								Latest from your active bundle
							</h3>
							<CardDescription className="text-sm leading-relaxed  opacity-90 mb-0">See your latest roundup episodes here from {userCurationProfile?.selectedBundle?.name}</CardDescription>
							<CardContent className="px-0">
								<EpisodeCard
									imageUrl={latestBundleEpisode?.image_url}
									title={latestBundleEpisode?.title}
									publishedAt={latestBundleEpisode?.published_at || latestBundleEpisode.created_at}
									detailsHref={`/episodes/${latestBundleEpisode?.episode_id}`}
									durationSeconds={latestBundleEpisode?.duration_seconds}
									actions={<PlayButton onClick={() => playEpisode(latestBundleEpisode)} aria-label={`Play ${latestBundleEpisode?.title}`} />}
								/>
							</CardContent>
						</div>
					</div>
				</div>
			) : null}

			{!(isLoading || userCurationProfile) ? (
				<div className="hidden md:block max-w-2xl mt-12">
					<Alert>
						<AlertTitle>
							<AlertCircle className="h-4 w-4" />
							Would you like to get started with your feed?
						</AlertTitle>
						<AlertDescription className="mt-2">You haven't created a Weekly Bundled Feed yet. Create one to start managing your podcast curation.</AlertDescription>
						<div className="mt-4">
							<Button variant="default" size="sm" onClick={() => setIsCreateWizardOpen(true)}>
								Select a Bundle
							</Button>
						</div>
					</Alert>
				</div>
			) : null}

			<div className="bg-primary/30 md:bg-episode-card-wrapper w-full flex flex-col gap-0 justify-start items-start   shadow-xl shadow-black/30  mt-0 md:m-0 xl:flex-row md:gap-4 py-8 p-1  md:mt-4 md:mb-0 border-1  md:rounded-3xl overflow-hidden  md:p-0 md:justify-center align-start ">
				<div className="pt-0 px-5 md:pl-8 md:mt-8 w-full max-w-[300px] flex flex-col items-start justify-items-start">
					<p className="w-full mx-0 px-0  text-secondary-foreground md:px-0 text-base font-bold mb-4">Recently created episodes</p>
					<CardDescription className="w-full px-0 md:px-0 text-sm text-secondary-foreground-muted  opacity-90">View and manage your recently generated episodes.</CardDescription>
					<div className="w-full flex flex-row md:flex-col gap-2">
						{(subscription?.plan_type || "").toLowerCase() === "curate_control" && (
							<Link href="/my-episodes" passHref className="px-0 mr-4">
								<Button variant="default" size="sm" className="mt-4">
									My Episodes
								</Button>
							</Link>
						)}
						<Link href="/generate-my-episodes" passHref>
							<Button variant="default" size="sm" className="mt-4 ">
								Episode Creator
							</Button>
						</Link>
					</div>
				</div>
				<CardContent className="px-1 w-full md:p-8">
					{isLoading ? (
						<div className="bg-[#1719248a] p-2 md:px-2 rounded-xl flex flex-col w-full min-w-full overflow-hidden gap-2 lg:px-2">
							<div className="bg-[#2f4383]/30 h-[130px] w-full animate-pulse rounded-lg" />
							<div className="bg-[#2f4383]/30 h-[130px] w-full animate-pulse rounded-lg" />
							<div className="bg-[#2f4383]/30 h-[130px] w-full animate-pulse rounded-lg" />
						</div>
					) : userEpisodes.length === 0 ? (
						<p className="text-muted-foreground text-xs">No generated episodes yet.</p>
					) : (
						<ul className="bg-[#1719248a]   p-2 md:px-2  rounded-xl flex flex-col w-full min-w-full overflow-hidden gap-2 lg:px-2">
							{userEpisodes
								.filter(e => e.status === "COMPLETED" && !!e.signedAudioUrl)
								.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
								.slice(0, 3)
								.map(episode => (
									<li key={episode.episode_id} className="list-none w-full">
										<EpisodeCard
											imageUrl={null}
											title={`${episode.episode_title}`}
											publishedAt={episode.updated_at}
											detailsHref={`/my-episodes/${episode.episode_id}`}
											youtubeUrl={episode.youtube_url}
											isNewsEpisode={!!(episode.news_sources || episode.news_topic)}
											actions={
												episode.status === "COMPLETED" &&
												episode.signedAudioUrl && (
													<PlayButton
														onClick={() => {
															// Create a normalized episode for the audio player
															const normalizedEpisode: UserEpisode = {
																episode_id: episode.episode_id,
																episode_title: episode.episode_title,
																gcs_audio_url: episode.signedAudioUrl,
																summary: episode.summary,
																created_at: episode.created_at,
																updated_at: episode.updated_at,
																user_id: episode.user_id,
																youtube_url: episode.youtube_url,
																transcript: episode.transcript,
																status: episode.status,
																duration_seconds: episode.duration_seconds,
																news_sources: episode.news_sources ?? null,
																news_topic: episode.news_topic ?? null,
																is_public: false,
																public_gcs_audio_url: null,
															};

															playEpisode(normalizedEpisode);
														}}
														aria-label={`Play ${episode.episode_title}`}
														className="m-0"
													/>
												)
											}
										/>
									</li>
								))}
						</ul>
					)}
				</CardContent>
			</div>

			{userCurationProfile && <EditUserFeedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} collection={userCurationProfile} onSave={handleSaveUserCurationProfile} />}

			{/* Create Personalized Feed / Bundle selection wizard */}
			<Dialog open={isCreateWizardOpen} onOpenChange={setIsCreateWizardOpen}>
				<DialogContent className="w-full overflow-y-auto px-8">
					<DialogHeader>
						<DialogTitle>
							<Typography variant="h3">Personalized Feed Builder</Typography>
						</DialogTitle>
					</DialogHeader>
					<UserFeedWizardWrapper
						onSuccess={async () => {
							setIsCreateWizardOpen(false);
							await fetchAndUpdateData();
						}}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function UserFeedWizardWrapper({ onSuccess }: { onSuccess: () => void }) {
	const { userCurationProfile } = useUserCurationProfileStore();
	const [hasCreated, setHasCreated] = useState(false);

	useEffect(() => {
		if (userCurationProfile && !hasCreated) {
			setHasCreated(true);
			onSuccess();
		}
	}, [userCurationProfile, hasCreated, onSuccess]);

	return <UserFeedSelector />;
}
