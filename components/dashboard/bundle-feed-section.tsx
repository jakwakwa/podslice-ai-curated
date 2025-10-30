"use client";

import { useState } from "react";
import { toast } from "sonner";
import EditUserFeedModal from "@/components/edit-user-feed-modal";
import type { Episode, UserCurationProfile, UserCurationProfileWithRelations } from "@/lib/types";
import { BundleSummaryPanel } from "./bundle-summary-panel";
// import { LatestBundleEpisode } from "./latest-bundle-episode";

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
export function BundleFeedSection({ userCurationProfile, subscription, bundleEpisodes = [] }: BundleFeedSectionProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);

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

			// Trigger page refresh by reloading
			window.location.reload();
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			toast.error(`Failed to update Personalized Feed: ${message}`);
		}
	};

	return (
		<>
			<div className="bg-bigcard visible px-6 mt-0 w-full md:max-w-[60vw] flex flex-col gap-0 justify-center items-baseline shadow-md shadow-stone-950
			md:mt-4 md:m-0 xl:flex-row md:gap-1 pt-0 md:mb-0 md:border-[#12121760] md:border-1 md:rounded-3xl lg:max-w-[70vw] lg:w-screen rounded-lg xl:max-w-[400px]">
				<div className="md:flex pt-0 w-full mt-0 flex-col xl:flex-row rounded-lg">
					<BundleSummaryPanel userCurationProfile={userCurationProfile} subscription={subscription} onUpdateBundle={() => setIsModalOpen(true)} bundleEpisodes={bundleEpisodes} />

				</div>
			</div>

			<EditUserFeedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} collection={userCurationProfile} onSave={handleSaveUserCurationProfile} />
		</>
	);
}
