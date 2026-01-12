"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getEpisodeAssets } from "@/lib/intelligence-helpers";
import type { UserEpisode } from "@/lib/types";
import type { MentionedAsset } from "@/lib/types/intelligence";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, EllipsisIcon } from "lucide-react";
import { CircularProgress } from "@/components/ui/circular-progress";
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
		const assets = getEpisodeAssets(ep);

		// Ticker Filter
		if (selectedTicker) {
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
		<div className="rounded-xl px-2 border border-zinc-800 bg-[#111216] overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="border-b border-zinc-800 hover:bg-transparent">
						<TableHead className="w-[300px] text-[9px] text-zinc-400 uppercase tracking-wider font-medium">
							Source & Title
						</TableHead>
						<TableHead className="text-[9px] text-zinc-400 uppercase tracking-wider font-medium">
							Reliability
						</TableHead>
						<TableHead className="text-[9px] text-zinc-400 uppercase tracking-wider font-medium">
							Sentiment
						</TableHead>
						<TableHead className="text-[9px] text-zinc-400 uppercase tracking-wider font-medium">
							Tickers
						</TableHead>
						<TableHead className="text-right text-[9px] text-zinc-400 uppercase tracking-wider font-medium">
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
							const assets = getEpisodeAssets(episode);

							// Calculate gradient color for sentiment bar
							const score = episode.sentiment_score ?? 0; // -1 to 1
							const isPositive = score >= 0;
							const reliabilityPercent = Math.abs(score) * 100;

							// Sentiment label and colors matching design
							const label = isPositive ? "BULLISH" : "BEARISH";
							const sentimentBadgeColor = isPositive
								? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
								: "bg-rose-500/20 text-rose-400 border-rose-500/20";

							// Mock reliability (80-99%)
							const reliability = 85 + (episode.episode_title.length % 15);

							return (
								<TableRow
									key={episode.episode_id}
									className="border-b border-zinc-800/50 hover:bg-violet-500/5 transition-colors">
									<TableCell className="font-medium py-5">
										<div className="flex flex-col gap-1">
											<span className="text-foreground font-semibold text-xs truncate text-overflow-ellipsis max-w-[310px]">
												{episode.episode_title}
											</span>
											<span className="text-[10px] text-zinc-500 uppercase font-medium tracking-wider">
												ARCHETYPE: {episode.voice_archetype || "ANALYST"}
											</span>
										</div>
									</TableCell>
									<TableCell className="gap-0  items-center w-[70px] mx-auto">
										<div className="flex items-center gap-4 justify-center w-[70px]">
											<CircularProgress
												value={reliability}
												size={32}
												strokeWidth={3}
												indicatorClassName="text-violet-500"
												trackClassName="text-zinc-800"
												valueClassName="text-[9px] font-bold text-zinc-400"
											/>
										</div>
									</TableCell>
									<TableCell className="gap-0  items-center  mx-auto">
										<div className="flex items-center gap-4 justify-center w-[150px]">
											<CircularProgress
												value={reliabilityPercent} // Using score magnitude as %
												size={32}
												strokeWidth={3}
												indicatorClassName={
													isPositive ? "text-emerald-500" : "text-rose-500"
												}
												trackClassName="text-zinc-800"
												valueClassName={cn(
													"text-[9px] font-bold",
													isPositive ? "text-emerald-400" : "text-rose-400"
												)}
											/>
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
									</TableCell>
									<TableCell className="py-5">
										<div className="flex flex-row gap-1 w-full">
											<div className="flex flex-nowrap gap-2 justify-center items-center h-6">
												{assets.length > 0 ? (
													<>
														{assets.slice(0, 2).map(asset => (
															<TickerBadge key={asset.ticker} ticker={asset.ticker} />
														))}
														{assets.length > 2 && (
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<button
																		type="button"
																		className="flex items-center justify-center p-1 h-full mt-4 rounded-full hover:bg-white/10 transition-colors focus:outline-none">
																		<EllipsisIcon className="h-full w-4 text-muted-foreground" />
																	</button>
																</DropdownMenuTrigger>
																<DropdownMenuContent
																	align="start"
																	className="w-[130px] px-4 py-2 max-h-[200px] bg-violet-500/20 rounded-xl shadow-2xs border-violet-400/50 border-2">
																	<div className="flex flex-col flex-wrap items-center gap-4 p-1">
																		{assets.slice(2).map(asset => (
																			<div key={asset.ticker} className="max-w-[60px]">
																				<TickerBadge ticker={asset.ticker} />
																			</div>
																		))}
																	</div>
																</DropdownMenuContent>
															</DropdownMenu>
														)}
													</>
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
