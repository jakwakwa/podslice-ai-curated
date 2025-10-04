import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
	"inline-flex items-center  content-center justify-center rounded border border-[#5664718E] px-3.5 py-0 font-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-5 text-[0.6rem] text-center",
	{
		variants: {
			variant: {
				default:
					"border-teal-400 bg-teal-800 font-normal text-primary-foreground shadow hover:bg-primary/80",
				secondary:
					"border-amber-400 bg-amber-800  font-normal  text-secondary-foreground ",
				destructive:
					"border-transparent border-amber-600 text-amber-300 shadow hover:bg-amber/80 font-normal",
				outline: "text-foreground font-normal",
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
