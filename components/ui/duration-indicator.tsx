"use client";
import type React from "react";

type DurationIndicatorProps = {
	seconds?: number | null;
	label?: string | null;
	size?: "xs" | "sm";
};

function formatDuration(totalSeconds?: number | null): string {
	if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds <= 0) return "n/a";
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);
	if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function DurationIndicator({ seconds, size = "sm" }: DurationIndicatorProps): React.ReactElement {
	const sizeClasses = {
		xs: "text-[0.5rem]",
		sm: "text-[0.4rem]",
	};
	const duration = formatDuration(seconds);
	return <div className={` inline py-0  h-auto leading-none ${sizeClasses[size]} no-wrap text-foreground/70 font-medium text-[0.6rem]`}>{duration ? `${duration}` : "0:00"}</div>;
}
