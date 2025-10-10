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
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EpisodeCard from "@/components/ui/episode-card";
import { PageHeader } from "@/components/ui/page-header";
import { Body, Typography } from "@/components/ui/typography";
import { useEpisodePlayer } from "@/hooks/use-episode-player";
import { useUserCurationProfileStore } from "@/lib/stores/user-curation-profile-store";
import type { Episode, UserCurationProfile, UserCurationProfileWithRelations, UserEpisode } from "@/lib/types";

interface SubscriptionInfo {
	plan_type: string;
	status: string;
}

export default function CurationProfileManagementPage() {
	const [userCurationProfile, setUserCurationProfile] = useState<UserCurationProfileWithRelations | null>(null);
	const [_episodes, setEpisodes] = useState<Episode[]>([]);
	const [_bundleEpisodes, setBundleEpisodes] = useState<Episode[]>([]);
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
		_bundleEpisodes.length > 0 ? _bundleEpisodes.sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())[0] : null;

	return (
		<div className=" h-full min-h-[84vh] overflow-hidden rounded-none bg-episode-card-wrapper px-0  mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:border-2 md:border-[#c8d3da32] md:rounded-4xl shadow-lg md:mt-4 md:p-8 md:w-full">
			<PageHeader
				title="Your dashboard"
				description="Choose from our pre-curated podcast bundles. Each bundle is a fixed selection of 2-5 carefully selected shows and cannot be modified once selected."
			/>
			{isLoading ? <div className="py-3 animate-pulse m-0 text-teal-200  text-xs mx-auto">loading feed...</div> : null}

			{/* BUNDLE FEED */}
			{!isLoading && userCurationProfile && latestBundleEpisode ? (
				<div className=" w-full flex flex-col gap-0 justify-center items-baseline shadow-md shadow-stone-950  mt-0 md:mt-4 md:m-0 xl:flex-row md:gap-4 pt-0 md:mb-0 border-[#12121760]  border-1 bg-[#141d2682] md:rounded-3xl overflow-hidden ">
					<div className="w-full pt-0 mt-0 flex flex-col lg:flex-row">
						{/* FEED BOX */}
						<div className="w-full pt-0 pr-4 mt-0 md:mr-3 flex flex-col  md:bg-lg:flex-col md:p-8 sm:pt-0 md:pt-9 md:mt-0  md:max-w-[280px]   md:bg-[#131621] overflow-hidden ">
							<div className="w-full flex flex-col justify-between p-0 rounded-2xl ">
								<CardTitle className="pt-8 md:pt-0 md:px-0 pb-3 text-sm max-w-[100%]">Your Active Bundle Feed</CardTitle>

								{userCurationProfile?.is_bundle_selection && userCurationProfile?.selectedBundle && (
									<div className="bg-[#262b3f67] border-b-0  border-0 border-[#0e0d0da9] mx-auto px-5 w-full h-fit  rounded-t-lg overflow-hidden">
										<Button className="inline-flex text-xs justify-end w-full px-0" variant="ghost" size="xs" onClick={() => setIsModalOpen(true)}>
											<Edit />
											Edit Bundle
										</Button>
										<div className="mb-4 flex flex-col">
											<Typography as="h2" className="text-[10px] w-full uppercase font-sans font-bold text-[#46FAFD]/70 p-0 mb-2">
												Active bundle:
											</Typography>

											<div className="flex w-full px-2 md:px-2 py-1 border-[#d4b1e125] rounded border-1 gap-3">
												<Typography className="flex w-full text-[10px] font-bold items-center gap-2">
													<BoxesIcon color={"#b6a5e5"} size={16} />
													<span className=" text-[12px] text-[#94a2e7]  gap-3 font-sans  text-left font-bold">{userCurationProfile.selectedBundle.name}</span>
												</Typography>
											</div>
										</div>
									</div>
								)}
							</div>

							<div className="mt-0 w-full overflow-hidden shadow-md   ">
								<div className="bg-[#393247]/30 border-t-0 overflow-hidden rounded-b-2xl border-1 border-[#51516500] px-4 p-4">
									<Body className="pt-0 pl-2 text-foreground/90 uppercase font-bold font-sans text-[10px]"> Summary</Body>
									<div className="flex flex-col justify-start gap-2 items-start my-2 px-0 w-full border-1 border-gray-800 rounded-md overflow-hidden pt-0">
										<div className="flex flex-row justify-between gap-1 items-center h-9 w-full bg-black/10 py-3 px-2">
											<span className="font-sans text-accent-foreground/80 text-xs">Bundled Episodes:</span>
											<span className="uppercase left text-indigo-300/60 text-[0.7rem] font-mono font-medium ">{userCurationProfile?.selectedBundle?.episodes?.length || 0}</span>
										</div>

										<div className="flex flex-row justify-between gap-2 items-center h-5 w-full py-3 px-2">
											<span className="text-foreground/60 text-xs font-medium font-sans">Plan:</span>
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
						{/* Latest Bundle Episode Section */}
						<div className="w-full border-b-0 rounded-0 py-0  my-0 mx-0 border-[#2c2a2a17] mt-0 pt-6 px-4 sm:pt-0  md:pt-9 md:mt-0  md:mb-8  md:px-6 border-dark md:rounded-3xl overflow-hidden  ">
							<h3 className="flex flex-col font-bold w-full  mb-4 md:flex-row items-start  text-lg md:text-lg gap-2">
								<span className="bg-[#089e69] rounded-sm shadow shadow-[#1a0b2f3f]  animate-pulse ease-in-out  text-xs duration-200 px-1.5 py-0.5  md:text-sm mr-2">New</span>Latest from your active
								bundle
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
				<div className="max-w-2xl mt-12">
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

			<div className="bg-[#0a0d10a0] w-full flex flex-col gap-0 justify-start items-start   shadow-xl shadow-black/30  mt-0 md:m-0 xl:flex-row md:gap-4 py-8 p-0 md:mt-4 md:mb-0 border-1 border-[#1a1d1dc0]  md:rounded-3xl overflow-hidden  md:p-0 md:justify-center align-start ">
				<div className="pt-2 pl-8 md:mt-8 w-full max-w-[300px] flex flex-col items-start justify-items-start">
					<p className="w-full px-0  text-indigo-100/80 md:px-0 text-base   font-bold mb-4">Recently created episodes</p>
					<CardDescription className="w-full px-0 md:px-0 text-sm text-indigo-100/60  opacity-90">View and manage your recently generated episodes.</CardDescription>
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
				<CardContent className="px-1 w-full md:p-8">
					{userEpisodes.length === 0 ? (
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
