"use client";

import { TickerBadge } from "./ticker-badge";

const TOP_TICKERS = [
	"$BTC",
	"$ETH",
	"$SOL",
	"$MSTR",
	"$NVDA",
	"$TSLA",
	"$SPY",
	"$QQQ",
	"$COIN",
	"$IBit",
];

export function TickerTape() {
	return (
		<div className="w-full border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
			<div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
				<div className="flex w-full items-center p-4 gap-4">
					<span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">
						Market Pulse:
					</span>
					{TOP_TICKERS.map(ticker => (
						<TickerBadge key={ticker} ticker={ticker} />
					))}
				</div>
			</div>
		</div>
	);
}
