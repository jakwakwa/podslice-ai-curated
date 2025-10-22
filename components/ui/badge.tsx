import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center text-primary content-center justify-center rounded border px-3.5 py-0 font-light transition-colors focus:outline-none focus:ring-2 rounded-sm text-foreground focus:ring-ring focus:ring-offset-2 h-5 text-[0.6rem] text-center",
  {
    variants: {
      variant: {
        default:
          "border-primary font-light font-sans text-primary-foreground  shadow hover:bg-primary border-1 rounded-sm",
        secondary:
          "flex items-center   text-[0.6rem] shadow-md shadow-black/10  font-light border-1 border-foreground/60 bg-primary rounded",
        status:
          "border-blue-600  text-blue-400 shadow font-light border-1 rounded-sm bg-blue-800 animate-pulse",
        destructive:
          "border-destructive-foreground  text-destructive-foreground shadow hover:bg-amber/80 font-light border-1 rounded-sm",
        outline:
          "text-xs flex   font-sans items-center shadow-md  px-0 text-left overflow-hidden rounded border-1 border-foreground/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
