import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer disabled:z-20 w-fit text-slate-100/80 min-w-12 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-150",
	{
		variants: {
			variant: {
				default:
					"bg-linear-to-br from-[#886FCD] to-violet-700 text-slate-100/80 hover:text-cyan-100 shadow-md text-shadow-black/20 text-shadow-md  md:min-w-[100px] px-4 text-lg leading-0  text-[0.95rem] shadow-[0_2px_4px_1px]  shadow-slate-950/70 rounded-xl  shadow-md shadow-slate-900/30 h-12",
				destructive:
					"bg-[#2909129B] border-2 border-[#763751] text-[#C67E98] shadow-[0_2px_4px_1px] shadow-slate-900/40 rounded-full px-0 w-10 h-14 shadow-lg shadow-slate-950/10 text-slate-300/80",
				outline:
					"border-[1.5px] border-white/50 bg-gray-900/10 disabled:bg-[#6B6791C8] text-primary-foreground font-bold disabled:text-[#A1B7F4D4] shadow-md shadow-slate-950/20 px-0 overflow-hidden w-[36px] px-4 w-fit max-w-[200px] rounded-xl",
				secondary:
					"btn-secondary disabled:bg-[#5E5C6FC8]  rounded-lg border-1 border-[#86D2F5] text-slate-300/80 shadow-[0px_4px_rgba(26, 40, 46, 0.9)] w-full md:max-w-fit px-4 text-[1rem] hover:text-secondary-foreground hover:text-secondary-foreground shadow-lg shadow-black shadow-slate-950/20 h-8",
				ghost: "text-secondary-foreground h-6 ",
				link: "text-secondary-foreground underline-offset-4 text-slate-100/80 hover:underline h-6",
				play: "p-0 m-0 h-8",
				icon: "h-8 ",
			},
			size: {
				default:
					"h-12 md:px-4 flex items-center justify-center text-[0.8rem] capitalize font-semibold",
				sm: "h-10 w-fit",
				lg: "h-14",
				md: " rounded-md text-[0.9rem]  font-medium",
				xs: "p-0  h-8 text-xs",
				icon: "h-8 w-8",
				play: "btn-playicon",
				playSmall:
					"h-12 md:px-4 flex items-center justify-center text-[0.8rem] capitalize font-semibold bg-[var(--header)]/70 disabled:bg-[#6B6791C8] text-accent-foreground  font-bold disabled:text-[#A1B7F4D4] shadow-md shadow-slate-950/20 px-0 overflow-hidden w-[36px] px-4 w-fit max-w-[200px] rounded-xl",
				playLarge: "btn-playicon-lg",
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

function Button({
	className,
	variant,
	size,
	asChild = false,
	children,
	icon,
	...props
}: React.ComponentProps<"button"> & {
	variant:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link"
		| "play"
		| "icon";
	size?:
		| "default"
		| "sm"
		| "xs"
		| "md"
		| "lg"
		| "playLarge"
		| "playSmall"
		| "play"
		| "icon";
	asChild?: boolean;
	icon?: React.ReactNode;
}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}>
			{variant === "play" && icon ? icon : children}
		</Comp>
	);
}

export { Button, buttonVariants };
