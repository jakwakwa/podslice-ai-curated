"use client";

import { PlayIcon } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Aria label for accessibility - defaults to "Play episode" */
	"aria-label"?: string;
	/** Whether the episode is currently playing */
	isPlaying?: boolean;
	/** Icon size - defaults to standard PlayIcon size */
	iconSize?: number;
	/** Additional class names to extend (not override) the core styling */
	className?: string;
	/** Click handler */
	onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Canonical Play Button for Episode Cards
 *
 * This is the standard play button used across all episode cards in the application.
 * It enforces consistent styling and behavior.
 *
 * Standard Props:
 * - variant: "play"
 * - size: "sm"
 * - icon: PlayIcon
 * - className: "btn-playicon rounded-[14px]"
 *
 * Interactions:
 * - Keyboard: Enter and Space activate play
 * - Focus: visible focus ring consistent across themes
 * - Hover and active states: consistent with design system
 * - Disabled state when the episode is locked or has no audio
 *
 * Accessibility:
 * - aria-label: defaults to "Play episode"
 * - aria-pressed: reflects playing state if isPlaying is true
 */
export function PlayButton({
	"aria-label": ariaLabel = "Play episode",
	isPlaying = false,
	iconSize,
	className,
	onClick,
	disabled,
	...props
}: PlayButtonProps) {
	return (
		<Button
			variant="play"
			size="sm"
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			aria-pressed={isPlaying}
			className={cn(
				"inline-flex p-0 border border-amber-300 rounded-full items-start justify-center btn-playicon z-1  shadow-sm shadow-azure-300",
				className
			)}
			icon={<PlayIcon size={iconSize} className="bg-[#1d1d4d71]/80" />}
			type="button"
			{...props}
		/>
	);
}
