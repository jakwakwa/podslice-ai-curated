"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

interface TickerBadgeProps {
	ticker: string; // e.g., "$BTC"
	className?: string;
}

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

	return (
		<Badge
			variant="outline"
			onClick={handleClick}
			className={cn(
				"cursor-pointer transition-colors hover:bg-primary/10",
				isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
				className
			)}>
			{ticker}
		</Badge>
	);
}
