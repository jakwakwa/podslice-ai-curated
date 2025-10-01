"use client";

import { AlertCircle, BoxesIcon, Edit } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import EditUserFeedModal from "@/components/edit-user-feed-modal";
import { PlayButton } from "@/components/episodes/play-button";
import UserFeedSelector from "@/components/features/user-feed-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppSpinner } from "@/components/ui/app-spinner";
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

// CSS module migrated to Tailwind classes

const _formatDate = (date: Date | null | undefined) => {
	if (!date) return "N/A";
	return new Date(date).toLocaleString();
};

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
		<div className="flex flex-col gap-0 md:gap-3 lg:gap-6 w-full episode-card-wrapper ">
			<PageHeader
				title="Your dashboard"
				description="Choose from our pre-curated podcast bundles. Each bundle is a fixed selection of 2-5 carefully selected shows and cannot be modified once selected."
			/>

			{/* Latest Bundle Episode Section */}
			{latestBundleEpisode && (
				<div className="w-full space-y-0 episode-card-wrapper border-dark border-b-dark">
					<CardTitle className="mb-4 flex items-center">
						<span className="bg-[#339991] rounded-sm shadow shadow-[#1a0b2f3f]  animate-pulse ease-in-out duration-200 px-1.5 py-0.5 text-xs mr-2">New</span>Episode from your activated Bundle
					</CardTitle>
					<CardDescription className="text-xs opacity-90 mb-4">The most recent episode from your selected bundle: {userCurationProfile?.selectedBundle?.name}</CardDescription>
					<CardContent className="px-0">
						<EpisodeCard
							imageUrl={latestBundleEpisode.image_url}
							title={latestBundleEpisode.title}
							publishedAt={latestBundleEpisode.published_at || latestBundleEpisode.created_at}
							durationSeconds={latestBundleEpisode.duration_seconds}
							actions={
								<PlayButton
									onClick={() => {
										console.log("Dashboard - Setting bundle episode:", latestBundleEpisode);
										playEpisode(latestBundleEpisode);
									}}
									aria-label={`Play ${latestBundleEpisode.title}`}
								/>
							}
						/>
					</CardContent>
				</div>
			)}

			{isLoading ? (
				<div className="p-0 max-w-[1200px] mx-auto">
					<div className="flex items-center justify-center min-h-[400px]">
						<AppSpinner variant="wave" size="lg" label="Loading Personalized Feed..." />
					</div>
				</div>
			) : userCurationProfile ? (
				<div className="flex flex-col lg:flex-row gap-4 ">
					<div className="w-full lg:w-1/2 episode-card-wrapper shadow-2xl shadow-cyan-950">
						<div className="w-full flex flex-col justify-between pb-0 rounded-2xl ">
							<CardTitle className="mb-4 max-w-[100%]">Your Bundled Feed</CardTitle>

							{/*  */}
							{userCurationProfile?.is_bundle_selection && userCurationProfile?.selectedBundle && (
								<div className="bg-[#3c24544a]  border-1 border-[#ffffff0a]  rounded-t-md  p-4">
									<Button className="inline-flex justify-end w-full px-2" variant="ghost" size="xs" onClick={() => setIsModalOpen(true)}>
										<Edit />
									</Button>
									<div className="mb-4 flex flex-col">
										<Typography as="h2" className="text-[13px]  w-full uppercase font-sans font-bold text-[#A7D1E4]/70 p-0 mb-4">
											FEED @id:<div className="text-foreground">{userCurationProfile?.name}</div>
										</Typography>
										{/* <Typography className="text-xs text-foreground/50 mb-6"> Custom Description: {userCurationProfile.selectedBundle.description}</Typography> */}

										<div className="px-2 py-1 border-[#d4b1e125] rounded border-1 w-fit">
											<Typography className="text-[12px] font-bold uppercase">
												<span className="text-[11px] text-[#94a2e7] flex gap-2 items-center font-sans font-bold">
													<BoxesIcon color={"#b6a5e5"} size={16} />
													{userCurationProfile.selectedBundle.name}
												</span>
											</Typography>
										</div>
									</div>
								</div>
							)}
						</div>

						<div className="mt-0 w-full overflow-hidden shadow-md  shadow-[#00000011] rounded-b-2xl ">
							<div className="bg-[#120D1D]/30   border-1 border-[#6351512a] px-4 p-4">
								<Body className="pt-0  pb-2 text-foreground/90 uppercase font-bold font-sans text-[10px]">Weekly Bundled Feed Summary</Body>
								<div className="flex flex-col justify-start gap-2 items-start my-2 px-0 w-full border rounded-md overflow-hidden pb-2 pt-0">
									<div className="flex flex-row justify-between gap-1 items-center h-9 w-full text-primary-forefround bg-muted-foreground/10 py-3 px-2">
										<span className="font-sans text-foreground/60 text-xs">Bundle Episode/s:</span>
										<span className="uppercase left text-teal-300/60 text-xs font-sans font-bold ">{userCurationProfile?.selectedBundle?.episodes?.length || 0}</span>
									</div>

									<div className="flex flex-row justify-between gap-2 items-center h-5 w-full py-3 px-2">
										<span className="text-foreground/60 text-xs font-sans">Plan Tier:</span>
										<span className="uppercase left text-teal-500/60 text-xs font-sans">{subscription?.plan_type?.replace(/_/g, " ") || "n/a"}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="w-full episode-card-wrapper px-4 mx-0 md:px-12 border-dark border-b-dark">
						<CardTitle className="w-full mb-4">Your recently generated episodes</CardTitle>
						<CardDescription className="text-xs opacity-90">View and manage your recently generated episodes.</CardDescription>
						{(subscription?.plan_type || "").toLowerCase() === "curate_control" && (
							<Link href="/my-episodes" passHref className="mr-4">
								<Button variant="default" size="sm" className="mt-4">
									My Episodes
								</Button>
							</Link>
						)}
						<Link href="/generate-my-episodes" passHref>
							<Button variant="default" size="sm" className="mt-4 mb-6">
								Episode Creator
							</Button>
						</Link>

						<CardContent className="px-0">
							{userEpisodes.length === 0 ? (
								<p className="text-muted-foreground text-xs">No generated episodes yet.</p>
							) : (
								<ul className="bg-[#0f0f104d] px-2 pt-2 pb-2 rounded-xl flex flex-col w-full gap-1 lg:px-2">
									{userEpisodes
										.filter(e => e.status === "COMPLETED" && !!e.signedAudioUrl)
										.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
										.slice(0, 3)
										.map(episode => (
											<li key={episode.episode_id} className="list-none">
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
																	};
																	console.log("Dashboard - Setting normalized UserEpisode:", normalizedEpisode);
																	console.log("Dashboard - Original episode signedAudioUrl:", episode.signedAudioUrl);
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
				</div>
			) : (
				<div className="max-w-2xl mt-8">
					<Alert>

						<AlertTitle><AlertCircle className="h-4 w-4" />Would you like to get started with your feed?</AlertTitle>
						<AlertDescription className="mt-2">You haven't created a Weekly Bundled Feed yet. Create one to start managing your podcast curation.</AlertDescription>
						<div className="mt-4">
							<Button variant="default" size="sm" onClick={() => setIsCreateWizardOpen(true)}>
								Select a Bundle
							</Button>
						</div>
					</Alert>
				</div>
			)}
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
