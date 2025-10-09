import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
	"inline-flex items-center text-indigp-400 content-center justify-center rounded border px-3.5 py-0 font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-5 text-[0.6rem] text-center",
	{
		variants: {
			variant: {
				default:
					"border-teal-300 bg-teal-800 font-normal font-mono text-primary-foreground shadow hover:bg-primary",
				secondary:
					"flex items-center  border-slate-600 bg-slate-800/90 text-xs font-mono font-medium font-mono  text-secondary-foreground border-1   h-5",
				destructive:
					"border-amber-400 border-red-600  text-[#6156BB] text-amber-300 shadow hover:bg-amber/80 font-normal",
				outline: "flex items-center bg-indigo-950/50 border-slate-600 border-1 min-w-[90px] px-0   h-5  text-left overflow-hidden",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
)

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
	VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	)
}

export { Badge, badgeVariants }
