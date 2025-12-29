"use client";

import { format } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { UserEpisode } from "@/lib/types";
import type { MentionedAsset } from "@/lib/types/intelligence";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import { TickerBadge } from "./ticker-badge";

// Extended type for component props (casting from Prisma result)
type MarketPulseEpisode = UserEpisode & {
	sentiment_score?: number | null;
	mentioned_assets?: MentionedAsset[] | unknown; // Prisma Json
	voice_archetype?: string | null;
};

interface MarketPulseTableProps {
	episodes: MarketPulseEpisode[];
}

export function MarketPulseTable({ episodes }: MarketPulseTableProps) {
	const { selectedTicker, minSentiment } = useDashboardStore();

	const filteredEpisodes = episodes.filter(ep => {
		// Ticker Filter
		if (selectedTicker) {
			if (!(ep.mentioned_assets && Array.isArray(ep.mentioned_assets))) return false;
			const assets = ep.mentioned_assets as unknown as MentionedAsset[];
			const hasTicker = assets.some(a => a.ticker === selectedTicker);
			if (!hasTicker) return false;
		}

		// Sentiment Filter
		if ((ep.sentiment_score ?? 0) < minSentiment) {
			return false;
		}

		return true;
	});

	return (
		<div className="rounded-2xl border border-zinc-800 bg-[#111216] overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="border-b border-zinc-800 hover:bg-transparent">
						<TableHead className="w-[300px] text-xs text-zinc-400 uppercase tracking-wider font-medium">
							Source & Title
						</TableHead>
						<TableHead className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
							Reliability
						</TableHead>
						<TableHead className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
							Sentiment
						</TableHead>
						<TableHead className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
							Mentioned Assets
						</TableHead>
						<TableHead className="text-right text-xs text-zinc-400 uppercase tracking-wider font-medium">
							Date
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredEpisodes.length === 0 ? (
						<TableRow>
							<TableCell colSpan={5} className="h-24 text-center text-zinc-500">
								No market data found.
							</TableCell>
						</TableRow>
					) : (
						filteredEpisodes.map(episode => {
							const assets = (Array.isArray(episode.mentioned_assets)
								? episode.mentioned_assets
								: []) as unknown as MentionedAsset[];

							// Calculate gradient color for sentiment bar
							const score = episode.sentiment_score ?? 0; // -1 to 1
							const isPositive = score >= 0;
							const reliabilityPercent = Math.abs(score) * 100;

							// Sentiment label and colors matching design
							const label = isPositive ? "BULLISH" : "BEARISH";
							const sentimentBadgeColor = isPositive
								? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
								: "bg-rose-500/20 text-rose-400 border-rose-500/20";
							const sentimentBarColor = isPositive
								? "bg-gradient-to-r from-emerald-500 to-emerald-400"
								: "bg-gradient-to-r from-rose-500 to-rose-400";

							// Mock reliability (80-99%)
							const reliability = 85 + (episode.episode_title.length % 15);

							return (
								<TableRow
									key={episode.episode_id}
									className="border-b border-zinc-800/50 hover:bg-violet-500/5 transition-colors">
									<TableCell className="font-medium py-5">
										<div className="flex flex-col gap-1">
											<span className="text-xs text-zinc-500 block">Source & Title</span>
											<span className="text-foreground font-semibold text-lg leading-tight">
												{episode.episode_title}
											</span>
											<span className="text-xs text-zinc-500 uppercase font-medium tracking-wider">
												{episode.voice_archetype || "ANALYST"}
											</span>
										</div>
									</TableCell>
									<TableCell className="py-5">
										<div className="flex flex-col gap-2">
											<div className="flex items-center gap-2">
												<div className="h-1.5 w-20 bg-zinc-700 rounded-full overflow-hidden">
													<div
														className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
														style={{ width: `${reliability}%` }}
													/>
												</div>
												<span className="text-xs font-bold text-foreground">
													{reliability}%
												</span>
											</div>
										</div>
									</TableCell>
									<TableCell className="py-5">
										<div className="flex flex-col gap-2">
											<div className="flex items-center gap-3">
												<div className="flex items-center gap-2">
													<div className="h-1.5 w-16 bg-zinc-700 rounded-full overflow-hidden">
														<div
															className={cn("h-full rounded-full", sentimentBarColor)}
															style={{ width: `${reliabilityPercent}%` }}
														/>
													</div>
													<span className="text-xs font-bold text-foreground">
														{Math.round(score * 100)}%
													</span>
												</div>
												<span
													className={cn(
														"px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1",
														sentimentBadgeColor
													)}>
													{label}
													{isPositive ? (
														<ArrowUp className="w-3 h-3" />
													) : (
														<ArrowDown className="w-3 h-3" />
													)}
												</span>
											</div>
										</div>
									</TableCell>
									<TableCell className="py-5">
										<div className="flex flex-col gap-1">
											<span className="text-xs text-zinc-500 mb-1">Mentioned Assets</span>
											<div className="flex flex-wrap gap-2">
												{assets.length > 0 ? (
													assets.map(asset => (
														<TickerBadge key={asset.ticker} ticker={asset.ticker} />
													))
												) : (
													<span className="text-xs text-zinc-500">-</span>
												)}
											</div>
										</div>
									</TableCell>
									<TableCell className="text-right text-xs text-zinc-500 py-5">
										{format(new Date(episode.created_at), "MMM d, HH:mm")}
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
	);
}
