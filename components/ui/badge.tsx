import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center text-primary content-center justify-center rounded border px-3.5 py-0 font-light transition-colors focus:outline-none focus:ring-2 rounded-sm text-foreground focus:ring-ring focus:ring-offset-2 h-5 text-[0.6rem] text-center",
	{
		variants: {
			variant: {
				default:
					"border-primary font-light font-sans text-primary-foreground  shadow hover:bg-background/20  border-1 rounded-sm",
				secondary:
					"flex items-center   text-[0.6rem] shadow-md shadow-black/10  font-light border-1 border-foreground bg-background/20  rounded",
				status:
					"border-blue-600  text-blue-400 shadow font-light border-1 rounded-sm bg-blue-800 animate-pulse min-h-6",
				destructive:
					"border-destructive-foreground  text-destructive-foreground shadow hover:bg-amber/80 font-light border-1 rounded-sm min-h-6",
				outline:
					"text-xs flex  border-2 border-indigo-300/30  font-sans items-center text-amber-300  min-h-6 shadow-md  px-3 py-1 text-left overflow-hidden rounded",
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
