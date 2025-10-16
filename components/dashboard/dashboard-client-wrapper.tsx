"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import EditUserFeedModal from "@/components/edit-user-feed-modal";
import UserFeedSelector from "@/components/features/user-feed-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Typography } from "@/components/ui/typography";
import { useUserCurationProfileStore } from "@/lib/stores";
import type { UserCurationProfile, UserCurationProfileWithRelations } from "@/lib/types";

interface DashboardClientWrapperProps {
	hasProfile: boolean;
	userCurationProfile: UserCurationProfileWithRelations | null;
	onProfileUpdated?: () => void;
}

/**
 * DashboardClientWrapper
 * Handles client-only interactions: modals, wizards, and profile updates
 */
export function DashboardClientWrapper({ hasProfile, userCurationProfile, onProfileUpdated }: DashboardClientWrapperProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);

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

			toast.success("Weekly Bundled Feed updated successfully!");
			setIsModalOpen(false);

			// Trigger page refresh
			if (onProfileUpdated) {
				onProfileUpdated();
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			toast.error(`Failed to update Personalized Feed: ${message}`);
		}
	};

	const handleWizardSuccess = async () => {
		setIsCreateWizardOpen(false);
		if (onProfileUpdated) {
			onProfileUpdated();
		}
	};

	return (
		<>
			{/* Empty state if no profile */}
			{!hasProfile && (
				<div className="hidden md:block max-w-2xl mt-12 ">
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
			)}

			{/* Edit modal */}
			{userCurationProfile && (
				<EditUserFeedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} collection={userCurationProfile} onSave={handleSaveUserCurationProfile} />
			)}

			{/* Create wizard */}
			<Dialog open={isCreateWizardOpen} onOpenChange={setIsCreateWizardOpen}>
				<DialogContent className="w-full overflow-y-auto px-8">
					<DialogHeader>
						<DialogTitle>
							<Typography variant="h3">Personalized Feed Builder</Typography>
						</DialogTitle>
					</DialogHeader>
					<UserFeedWizardWrapper onSuccess={handleWizardSuccess} />
				</DialogContent>
			</Dialog>
		</>
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

