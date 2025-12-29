"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

interface TickerBadgeProps {
	ticker: string; // e.g., "$BTC"
	className?: string;
}

/**
 * Color map for specific tickers matching the design
 * Default falls back to purple accent
 */
const TICKER_COLORS: Record<string, string> = {
	BTC: "bg-emerald-500 hover:bg-emerald-600",
	$BTC: "bg-emerald-500 hover:bg-emerald-600",
	ETH: "bg-blue-500 hover:bg-blue-600",
	$ETH: "bg-blue-500 hover:bg-blue-600",
	SOL: "bg-purple-500 hover:bg-purple-600",
	$SOL: "bg-purple-500 hover:bg-purple-600",
	STG: "bg-red-500 hover:bg-red-600",
	$STG: "bg-red-500 hover:bg-red-600",
	ETM: "bg-emerald-500 hover:bg-emerald-600",
	$ETM: "bg-emerald-500 hover:bg-emerald-600",
};

const DEFAULT_COLOR = "bg-violet-500 hover:bg-violet-600";

export function TickerBadge({ ticker, className }: TickerBadgeProps) {
	const { selectedTicker, setTickerFilter } = useDashboardStore();
	const isSelected = selectedTicker === ticker;

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		// Toggle: if already selected, clear it.
		if (isSelected) {
			setTickerFilter(null);
		} else {
			setTickerFilter(ticker);
		}
	};

	// Get ticker color from map or use default
	const tickerColor = TICKER_COLORS[ticker] ?? DEFAULT_COLOR;

	return (
		<Badge
			variant="outline"
			onClick={handleClick}
			className={cn(
				"cursor-pointer transition-all text-white font-bold text-[10px] border-0 rounded-full px-2 h-6",
				tickerColor,
				isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background",
				className
			)}>
			{ticker}
		</Badge>
	);
}
