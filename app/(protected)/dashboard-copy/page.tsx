"use client";

import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import EditUserFeedModal from "@/components/edit-user-feed-modal";
import EmptyStateCard from "@/components/empty-state-card";
import { EpisodeList } from "@/components/episode-list";
import { ProfileFeedCards } from "@/components/features/profile-feed-cards";
import UserFeedSelector from "@/components/features/user-feed-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppSpinner } from "@/components/ui/app-spinner";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Typography } from "@/components/ui/typography";
import { useEpisodesStore } from "@/lib/stores/episodes-store";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";
import type { Episode, UserCurationProfile, UserCurationProfileWithRelations } from "@/lib/types";
import { useUserCurationProfileStore } from "../../../lib/stores/user-curation-profile-store";

export default function Page() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
	const { setEpisode } = useAudioPlayerStore();

	// Use the episodes store
	const { combinedEpisodes, userCurationProfile, isLoading, error, fetchEpisodes, fetchUserCurationProfile, refreshData, clearError } = useEpisodesStore();

	// Fetch data on component mount
	useEffect(() => {
		const fetchData = async () => {
			try {
				await Promise.all([fetchEpisodes(), fetchUserCurationProfile()]);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				toast.error(`Failed to load dashboard data: ${message}`);
			}
		};

		fetchData();
	}, [fetchEpisodes, fetchUserCurationProfile]);

	// Clear error when component unmounts
	useEffect(() => {
		return () => {
			clearError();
		};
	}, [clearError]);

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

			// Refresh data after successful update
			await refreshData();

			toast.success("Personalized Feed updated successfully!");
			setIsModalOpen(false);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			toast.error(`Failed to update Personalized Feed: ${message}`);
		}
	};

	const handlePlayEpisode = useCallback(
		(episode: Episode) => {
			setEpisode(episode);
		},
		[setEpisode]
	);

	const _handleRefreshData = async () => {
		await refreshData();
	};

	if (isLoading) {
		return (
			<div className="p-8 mx-auto">
				<div className="flex items-center justify-center min-h-[400px]">
					<AppSpinner variant={"wave"} size="lg" label="Generating your personal Podslice Hub..." />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className=" mx-auto p-6">
				<PageHeader title="Your Dashboard" description="Overview of your episodes, selected bundles, feeds etc." level={1} spacing="default" />
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Error Loading Dashboard</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className=" w-full">
			{/* MAIN CONTAINER */}

			<PageHeader title=" Dashboard" description="Overview of your episodes, selected bundles, feeds etc." level={1} spacing="default" />

			<Card className="episode-card-wrapper flex flex-col pb-12 w-full px-4 gap-4 md:p-2 ">
				<div className="flex flex-col lg:flex-row gap-2">
					<div className="w-full  md:w-1/2">
						{userCurationProfile ? (
							<ProfileFeedCards userCurationProfile={userCurationProfile} showProfileCard={true} />
						) : (
							<EmptyStateCard
								title="Personalized Feed"
								message={{
									description: "It looks like you haven't created a Personalized Feed yet. Start by creating one!",
									notificationTitle: "No Personalized Feed Found",
									notificationDescription: "It looks like you haven't created a Personalized Feed yet. Start by creating one!",
									selectStateActionText: "Create Personalized Feed",
								}}
								selectStateAction={() => setIsCreateWizardOpen(true)}
							/>
						)}
					</div>

					<div className="w-full">
						{combinedEpisodes.length === 0 ? (
							<EmptyStateCard
								title="Episodes"
								message={{
									description: "It looks like you haven't created a Personalized Feed yet. Start by creating one!",
									notificationTitle: "No Episodes Found",
									notificationDescription: "It looks like you haven't created a Personalized Feed yet. Start by creating one!",
									selectStateActionText: "Create Personalized Feed",
								}}
							/>
						) : (
							<EpisodeList episodes={combinedEpisodes} onPlayEpisode={handlePlayEpisode} />
						)}
					</div>
				</div>
				{userCurationProfile && (
					<EditUserFeedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} collection={userCurationProfile as UserCurationProfileWithRelations} onSave={handleSaveUserCurationProfile} />
				)}

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
								await refreshData();
							}}
						/>
					</DialogContent>
				</Dialog>
				{/* Portal audio player to global container */}
			</Card>
		</div>
	);
}

function UserFeedWizardWrapper({ onSuccess }: { onSuccess: () => void }) {
	// Use a local state to track if the profile was created
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
