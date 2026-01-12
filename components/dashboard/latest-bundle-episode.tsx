"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { dashboardCopy } from "@/app/(protected)/dashboard/content";
import { Button } from "@/components/ui/button";
import { useEpisodePlayer } from "@/hooks/use-episode-player";
import type { Episode } from "@/lib/types";

interface LatestBundleEpisodeProps {
	episode: Episode | null;
	bundleName: string;
}

/**
 * WaveformBars
 * Animated waveform visualization background
 */
function WaveformBars() {
	const bars = [
		{ height: 10, delay: 0.1 },
		{ height: 11, delay: 0.2 },
		{ height: 10, delay: 0.3 },
		{ height: 3, delay: 0.4 },
		{ height: 20, delay: 0.5 },
		{ height: 24, delay: 0.1 },
		{ height: 10, delay: 0.2 },
		{ height: 13, delay: 0.3 },
		{ height: 10, delay: 0.4 },
		{ height: 11, delay: 0.5 },
		{ height: 18, delay: 0.1 },
		{ height: 14, delay: 0.2 },
		{ height: 12, delay: 0.3 },
		{ height: 18, delay: 0.4 },
	];

	return (
		<div className=" inset-0 flex items-center justify-center gap-[2px] opacity-30 px-0 py-4">
			{bars.map((bar, i) => (
				<div
					key={i}
					className="w-1 rounded-sm bg-violet-500 animate-pulse my-8"
					style={{
						height: `${bar.height}px`,
						animationDelay: `${bar.delay}s`,
						animationDuration: "1.5s",
					}}
				/>
			))}
		</div>
	);
}

/**
 * LatestBundleEpisode
 * Displays the most recent episode from the user's active bundle
 * Styled to match design with waveform background and audio player
 */
export function LatestBundleEpisode({
	episode,
	bundleName,
}: LatestBundleEpisodeProps): React.ReactNode {
	const { playEpisode } = useEpisodePlayer();
	const { sections } = dashboardCopy;

	if (!episode) {
		return null;
	}

	const durationMinutes = episode.duration_seconds
		? `${Math.floor(episode.duration_seconds / 60)}:${String(episode.duration_seconds % 60).padStart(2, "0")}`
		: "--:--";

	return (
		<div className="bg-[#111216] border border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col">
			{/* Header */}
			<div className="flex items-center gap-2 mb-4">
				<span className="text-xs font-bold bg-violet-500/20 text-violet-400 px-2 py-1 rounded animate-pulse">
					{sections.latestBundle.badge}
				</span>
				<h3 className="text-sm font-medium text-slate-200">
					{sections.latestBundle.title}
				</h3>
			</div>

			{/* Description */}
			<p className="text-xs text-zinc-400 mb-4">
				{sections.latestBundle.descriptionTemplate(bundleName)}
			</p>

			{/* Audio Player Card */}
			<div className="bg-black/40 rounded-xl p-4 mb-4  border-zinc-800 border-2 relative overflow-hidden w-full h-fit max-h-[165px]">
				<div className="flex flex-col justify-between w-full">
					{/* Episode Title */}
					<h4 className="font-semibold text-sm mb-0 max-w-[80%] leading-tight text-slate-200 w-full">
						{episode.title}
					</h4>
					<div className="flex flex-row-reverse justify-between items-center w-fit gap-8">
						<div className="flex items-end justify-end gap-0 w-1/2">
							<div className="w-full relative">
								<WaveformBars />
							</div>
							<div className="w-full relative">
								<WaveformBars />
							</div>
						</div>
						{/* Player Controls */}
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => playEpisode(episode)}
								className="h-10 w-10 rounded-full bg-emerald-600 border-emerald-500 border-2 text-black flex items-center justify-center hover:scale-105 transition-transform"
								aria-label={`Play ${episode.title}`}>
								<Play className="w-5 h-5 ml-0.5" fill="currentColor" />
							</button>

							<span className="text-xs font-mono text-zinc-400">{durationMinutes}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="flex justify-between items-center mt-auto">
				<Link href={`/episodes/${episode.episode_id}`}>
					<Button
						variant="default"
						size="sm"
						className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
						View Trade Insight
					</Button>
				</Link>
			</div>
		</div>
	);
}
