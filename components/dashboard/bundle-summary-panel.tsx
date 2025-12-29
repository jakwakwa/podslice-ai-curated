"use client";
import { Edit, Podcast, X } from "lucide-react";
import { useEffect } from "react";
import { dashboardCopy } from "@/app/(protected)/dashboard/content";
import { Button } from "@/components/ui/button";
import { PRICING_TIER } from "@/config/paddle-config";
import { useUserEpisodesStore } from "@/lib/stores/user-episodes-store";
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
 * Styled to match the design mockup
 */
export function BundleSummaryPanel({
	userCurationProfile,
	subscription,
	onUpdateBundle,
	bundleEpisodes = [],
}: BundleSummaryPanelProps) {
	const { sections } = dashboardCopy;

	// Get usage actions and state from the store
	const fetchCompletedEpisodeCount = useUserEpisodesStore(
		state => state.fetchCompletedEpisodeCount
	);
	const completedEpisodeCount = useUserEpisodesStore(
		state => state.completedEpisodeCount
	);

	// Fetch the latest count on mount
	useEffect(() => {
		fetchCompletedEpisodeCount();
	}, [fetchCompletedEpisodeCount]);

	// Determine the plan limit based on the subscription
	const currentPlanId = (subscription?.plan_type || "").toUpperCase();
	const planConfig = PRICING_TIER.find(tier => tier.planId === currentPlanId);
	const monthlyLimit = planConfig?.episodeLimit ?? 0;

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

	const quotaPercent =
		monthlyLimit > 0 ? (completedEpisodeCount / monthlyLimit) * 100 : 0;

	return (
		<div className="bg-[#111216] border border-zinc-800 rounded-2xl p-6 shadow-sm">
			{/* Header */}
			<div className="flex justify-between items-start mb-6">
				<h2 className="font-medium text-lg text-slate-200">Your Feed Details</h2>
			</div>

			{/* Edit Button */}
			<Button
				className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-violet-500/30 text-violet-400 bg-violet-500/5 hover:bg-violet-500/10 transition-colors text-sm font-medium mb-6"
				variant="ghost"
				onClick={onUpdateBundle}
				aria-label="Update bundle selection">
				<Edit className="w-4 h-4" />
				Edit Channel Overview
			</Button>

			{/* Content */}
			<div className="space-y-4">
				{/* Active Channel Overview */}
				<div className="p-3 bg-black/30 rounded-lg border border-zinc-800 flex items-center gap-2">
					<Podcast className="w-4 h-4 text-zinc-500" />
					<span className="text-sm text-zinc-400">Active Channel Overview</span>
				</div>

				{/* Feed Subscription */}
				<div className="flex justify-between items-center py-2 border-b border-zinc-800">
					<span className="text-sm text-zinc-400">Feed Subscription:</span>
					<span className="text-xs font-bold px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 tracking-wider uppercase">
						{userCurationProfile.selectedBundle?.name || "PODSLICE ORIGINALS"}
					</span>
				</div>

				{/* Available Summaries */}
				<div className="flex justify-between items-center py-2 border-b border-zinc-800">
					<span className="text-sm text-zinc-400">Available Summaries</span>
					<span className="text-sm font-semibold text-slate-200">
						{bundleEpisodes?.length || 0}
					</span>
				</div>

				{/* User Data Section */}
				<div className="pt-4">
					<span className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">
						USER DATA
					</span>
					<div className="p-3 bg-black/30 rounded-lg border border-zinc-800 flex items-center gap-2 mb-4">
						<X className="w-4 h-4 text-zinc-500" />
						<span className="text-sm text-zinc-400">Personal Content</span>
					</div>
				</div>

				{/* AI Summary Quota */}
				<div>
					<div className="flex justify-between text-sm mb-2">
						<span className="text-zinc-400">User's AI Summary Quote:</span>
						<span className="font-medium text-slate-200">
							{completedEpisodeCount}/{monthlyLimit}
						</span>
					</div>
					<div className="h-2 w-full bg-zinc-700 rounded-full overflow-hidden">
						<div
							className="h-full bg-emerald-500 rounded-full transition-all duration-300"
							style={{ width: `${Math.min(quotaPercent, 100)}%` }}
						/>
					</div>
				</div>

				{/* Membership Plan */}
				<div className="flex justify-between items-center pt-2">
					<span className="text-sm text-zinc-400">Membership Plan:</span>
					<span className="text-sm text-zinc-400 capitalize">{getPlanDisplay()}</span>
				</div>
			</div>
		</div>
	);
}
