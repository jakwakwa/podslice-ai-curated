import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center text-primary border-none content-center outline outline-1 justify-center rounded border px-2 py-0 font-light transition-colors focus:outline-none focus:ring-2 rounded-sm text-foreground focus:ring-ring focus:ring-offset-2 h-5 text-[0.6rem] text-center",
	{
		variants: {
			variant: {
				default:
					"border-primary font-light font-sans text-primary-foreground  shadow hover:bg-background/20  border-none rounded-xs",
				secondary:
					"flex items-center   text-[0.6rem] shadow-md shadow-black/10  font-light outline-1 outline-indigo-500 bg-indigo-950/30  rounded-xs",
				status:
					"outline-1 outline-blue-700 bg-blue-950/70 text-left overflow-hidden   text-blue-100 font-light outline-1 rounded-xs animate-pulse shadow-md min-h-6",
				destructive:
					"border-destructive-foreground  text-destructive-foreground shadow hover:bg-amber/80 font-light outline-1 rounded-xs min-h-6",
				outline:
					"text-xs flex  outline-1 outline-cyan-700 bg-cyan-950/30  font-sans items-center  min-h-5 shadow-md  px-2 py-1 text-left overflow-hidden rounded-xs",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
