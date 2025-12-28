"use client";

import { format } from "date-fns";
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
		<div className="rounded-md border bg-card">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[300px]">Source & Title</TableHead>
						<TableHead>Reliability</TableHead>
						<TableHead>Sentiment</TableHead>
						<TableHead>Mentioned Assets</TableHead>
						<TableHead className="text-right">Date</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredEpisodes.length === 0 ? (
						<TableRow>
							<TableCell colSpan={5} className="h-24 text-center">
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
							// Map -1..1 to 0..100% for red->green gradient
							// Simple approach: width is absolute, color depends on value
							const isPositive = score >= 0;
							const intensity = Math.abs(score) * 100;
							const barColor = isPositive ? "bg-emerald-500" : "bg-rose-500";
							const label = isPositive ? "Bullish" : "Bearish";

							// Mock reliability (80-99%)
							const reliability = 85 + (episode.episode_title.length % 15);

							return (
								<TableRow key={episode.episode_id}>
									<TableCell className="font-medium">
										<div className="flex flex-col">
											<span className="truncate max-w-[280px] text-foreground font-semibold">
												{episode.episode_title}
											</span>
											<span className="text-xs text-muted-foreground uppercase">
												{episode.voice_archetype || "Analyst"}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<span className="text-xs font-mono font-bold text-muted-foreground">
												{reliability}%
											</span>
											<div className="h-1.5 w-12 bg-secondary rounded-full overflow-hidden">
												<div
													className="h-full bg-blue-400"
													style={{ width: `${reliability}%` }}
												/>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1 w-[120px]">
											<div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold">
												<span>{Math.round(score * 100)}%</span>
												<span>{score === 0 ? "Neutral" : label}</span>
											</div>
											<div className="h-2 w-full bg-secondary rounded-full relative overflow-hidden">
												{/* Center marker */}
												<div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-background z-10" />
												{/* Bar */}
												<div
													className={cn("h-full absolute top-0", barColor)}
													style={{
														left: isPositive ? "50%" : undefined,
														right: isPositive ? undefined : "50%",
														width: `${intensity / 2}%`, // Since it takes up half space max
													}}
												/>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{assets.length > 0 ? (
												assets.map(asset => (
													<TickerBadge key={asset.ticker} ticker={asset.ticker} />
												))
											) : (
												<span className="text-xs text-muted-foreground">-</span>
											)}
										</div>
									</TableCell>
									<TableCell className="text-right text-xs text-muted-foreground">
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
