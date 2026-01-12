"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getEpisodeAssets } from "@/lib/intelligence-helpers";
import type { UserEpisode } from "@/lib/types";
import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { TickerBadge } from "./ticker-badge";

interface TickerTapeProps {
	episodes?: UserEpisode[]; // Optional to avoid breaking other usages initially
}

export function TickerTape({ episodes = [] }: TickerTapeProps) {
	const tickerList = useMemo(() => {
		const uniqueTickers = new Set<string>();
		// Always include a few defaults if you want, or just rely on data
		// Let's rely purely on data as requested, maybe fallback to empty or defaults if none
		if (episodes.length === 0) return []; // Or ["$BTC", "$ETH"] as fallback?

		for (const ep of episodes) {
			const assets = getEpisodeAssets(ep);
			for (const asset of assets) {
				if (asset.ticker) {
					uniqueTickers.add(asset.ticker);
				}
			}
		}

		return Array.from(uniqueTickers).sort();
	}, [episodes]);

	if (tickerList.length === 0) return null;

	const VISIBLE_COUNT = 10;
	const visibleTickers = tickerList.slice(0, VISIBLE_COUNT);
	const hiddenTickers = tickerList.slice(VISIBLE_COUNT);

	return (
		<div className="w-full border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
			<div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
				<div className="flex w-full items-center p-4 gap-4">
					<span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">
						Market Pulse:
					</span>
					{/* Desktop View: Limit 10 + Overflow */}
					<div className="hidden md:flex items-center gap-4">
						{visibleTickers.map(ticker => (
							<TickerBadge key={ticker} ticker={ticker} />
						))}

						{hiddenTickers.length > 0 && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors focus:outline-none">
										<ChevronDown className="h-4 w-4 text-muted-foreground" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-[200px] p-2">
									<div className="flex flex-wrap gap-2 p-1">
										{hiddenTickers.map(ticker => (
											<div key={ticker}>
												<TickerBadge ticker={ticker} />
											</div>
										))}
									</div>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>

					{/* Mobile View: Dropdown Only */}
					<div className="flex md:hidden h-[12px]">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none">
									<span>Select Ticker ({tickerList.length})</span>
									<ChevronDown className="h-3 w-3" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-[280px] p-4">
								<div className="flex flex-wrap gap-2 max-h-[200px] overflow-hidden">
									{tickerList.map(ticker => (
										<div key={ticker}>
											<TickerBadge ticker={ticker} />
										</div>
									))}
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</div>
	);
}
