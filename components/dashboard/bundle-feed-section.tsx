"use client";

import { useState } from "react";
import { toast } from "sonner";
import EditUserFeedModal from "@/components/edit-user-feed-modal";
import type {
	Episode,
	UserCurationProfile,
	UserCurationProfileWithRelations,
} from "@/lib/types";
import { BundleSummaryPanel } from "./bundle-summary-panel";

interface SubscriptionInfo {
	plan_type: string;
	status: string;
}

interface BundleFeedSectionProps {
	userCurationProfile: UserCurationProfileWithRelations;
	subscription: SubscriptionInfo | null;
	bundleEpisodes?: Episode[];
}

/**
 * BundleFeedSection
 * Client wrapper that coordinates the bundle summary panel and latest episode display
 * Handles the update modal state and profile updates
 */
export function BundleFeedSection({
	userCurationProfile,
	subscription,
	bundleEpisodes = [],
}: BundleFeedSectionProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleSaveUserCurationProfile = async (
		updatedData: Partial<UserCurationProfile>
	) => {
		if (!userCurationProfile) return;
		try {
			const response = await fetch(
				`/api/user-curation-profiles/${userCurationProfile.profile_id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(updatedData),
				}
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error || errorData.message || "Failed to update user curation profile"
				);
			}

			toast.success("Weekly Bundled Feed updated successfully!");
			setIsModalOpen(false);

			// Trigger page refresh by reloading
			window.location.reload();
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			toast.error(`Failed to update Personalized Feed: ${message}`);
		}
	};

	return (
		<>
			<BundleSummaryPanel
				userCurationProfile={userCurationProfile}
				subscription={subscription}
				onUpdateBundle={() => setIsModalOpen(true)}
				bundleEpisodes={bundleEpisodes}
			/>
			<EditUserFeedModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				collection={userCurationProfile}
				onSave={handleSaveUserCurationProfile}
			/>
		</>
	);
}
