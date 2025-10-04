"use client"

import { cn } from "@/lib/utils"

export default function Stepper({ step, className }: { step: number; className?: string }) {
	return (
		<span
			className={cn(
				"bg-secondary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center text-sm font-bold px-4 ",
				className
			)}
		>
			{step}
		</span>
	)
}


