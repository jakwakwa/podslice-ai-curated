import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground shadow-sm hover:bg-primary/50 cursor-pointer hover:shadow-md text-shadow-md text-shadow-[#00000060]",
				destructive:
					"bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
				outline:
					"border border-border bg-transparent shadow-sm hover:bg-muted hover:text-foreground",
				secondary:
					"bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 cursor-pointer hover:shadow-md",
				ghost: "hover:bg-muted hover:text-foreground",
				link: "text-primary underline-offset-4 hover:underline",
				play: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer rounded-full hover:shadow-md",
				icon: "hover:bg-muted hover:text-foreground p-0",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 rounded-md px-3 text-xs",
				lg: "h-10 rounded-md px-8",
				icon: "h-9 w-9",
				xs: "h-6 rounded-md px-2 text-xs", // Added xs size
				md: "h-9 px-4 py-2", // Added md size (same as default)
				playSmall: "h-8 w-8 p-0", // Added playSmall
				playLarge: "h-12 w-12 p-0", // Added playLarge
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	}
);
Button.displayName = "Button";

export { Button, buttonVariants };
