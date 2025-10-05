import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
	"inline-flex items-center  content-center justify-center rounded border border-[#5664718E] px-3.5 py-0 font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-5 text-[0.6rem] text-center",
	{
		variants: {
			variant: {
				default:
					"border-teal-400 bg-teal-800 font-normal font-mono text-primary-foreground shadow hover:bg-primary/80",
				secondary:
					"border-indigo-950 bg-slate-800/40 text-xs font-mono font-medium font-mono  text-secondary-foreground ",
				destructive:
					"border-amber-400 border-amber-600 font-mono text-amber-300 shadow hover:bg-amber/80 font-normal",
				outline: "bg-slate-800/20 border-slate-900/80 border-1 min-w-[110px] py-2 flex text-[#fff] font-mono text-left",
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
