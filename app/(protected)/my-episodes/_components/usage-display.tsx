"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PRICING_TIER } from "@/config/paddle-config";
import { useUserEpisodesStore } from "@/lib/stores/user-episodes-store";

export function UsageDisplay() {
	const [isLoading, setIsLoading] = useState(true);

	// ALWAYS CURATE_CONTROL PLAN
	const episodeLimit =
		PRICING_TIER.find(tier => tier.planId === "CURATE_CONTROL")?.episodeLimit || 20;

	const fetchCompletedEpisodeCount = useUserEpisodesStore(
		state => state.fetchCompletedEpisodeCount
	);
	const completedEpisodeCount = useUserEpisodesStore(
		state => state.completedEpisodeCount
	);
	const usage = { count: completedEpisodeCount, limit: episodeLimit };

	useEffect(() => {
		fetchCompletedEpisodeCount();
	}, [fetchCompletedEpisodeCount]);

	useEffect(() => {
		setIsLoading(false);
	}, []);

	if (isLoading) {
		return <Skeleton className="h-24 w-full" />;
	}

	// Calculate percentage for circular progress
	const percentage = usage.limit > 0 ? Math.round((usage.count / usage.limit) * 100) : 0;
	const strokeDasharray = 351.86;
	const strokeDashoffset = strokeDasharray * (1 - percentage / 100);
	const isAtLimit = usage.count >= usage.limit;

	return (
		<div className="sticky top-6 w-full lg:w-[300px] px-6 py-6 lg:py-0">
			{/* Header */}
			<h2 className="text-xl font-bold text-slate-200 mb-2">Monthly Usage</h2>
			<p className="text-zinc-400 text-sm mb-4 leading-relaxed">
				You have generated
				<br />
				<strong className="text-white">{usage.count}</strong> of your{" "}
				<strong className="text-white">{usage.limit}</strong> monthly episodes
			</p>

			{/* Circular Progress Card */}
			<div className="mt-4 p-6 rounded-3xl bg-card border border-border relative overflow-hidden group">
				{/* Background gradient overlay */}
				<div className="absolute inset-0 bg-linear-to-br from-primary/5 to-secondary/5 opacity-50" />

				<div className="relative z-10 flex flex-col items-center justify-center py-6">
					{/* Circular Progress */}
					<div className="relative w-32 h-32 flex items-center justify-center">
						<svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
							{/* Background circle */}
							<circle
								cx="64"
								cy="64"
								r="56"
								fill="transparent"
								stroke="currentColor"
								strokeWidth="8"
								className="text-[#191921]"
							/>
							{/* Progress circle */}
							<circle
								cx="64"
								cy="64"
								r="56"
								fill="transparent"
								stroke="currentColor"
								strokeWidth="8"
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
								strokeLinecap="round"
								className="text-emerald-400 group-hover:text-violet-500 transition-colors duration-500"
							/>
						</svg>
						{/* Center text */}
						<div className="absolute text-center">
							<span className="text-3xl font-bold text-white block">{percentage}%</span>
							<span className="text-[10px] text-zinc-400 uppercase tracking-widest">
								Used
							</span>
						</div>
					</div>

					{/* Status */}
					<div className="mt-4 text-center">
						<p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Status</p>
						<p
							className={
								isAtLimit ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"
							}>
							{isAtLimit ? "Limit Reached" : "Active"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
