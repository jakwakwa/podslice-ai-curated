import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-20 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
	{
		variants: {
			variant: {
				default: "btn-default text-primary-foreground shadow  md:min-w-[100px] h-auto text-lg px-3 leading-0  shadow-[0_2px_4px_1px]  shadow-slate-950/70 ",
				destructive: "bg-[#2909129B] border-2 border-[#763751] text-[#C67E98] shadow-[0_2px_4px_1px] shadow-slate-900/40 rounded-full px-0 w-10",
				outline: "border border-[#DEECEE6A] bg-[#0B101011] p-0 rounded-3xl shadow-sm text-[0.8rem] font-bold text-foreground/70  shadow-[0_2px_4px_1px]  shadow-slate-950/30 ",
				secondary: "btn-secondary disabled:bg-[#5E5C6F] rounded-lg border-1 border-[#31c5be] text-foreground shadow-[0px_4px_rgba(26, 40, 46, 0.9)] w-full md:max-w-fit px-4  text-[1rem] shadow-lg shadow-black",
				ghost: "",
				link: "text-primary-forefround underline-offset-4 hover:underline",
				play: "p-0 m-0",
				icon: "",
			},
			size: {
				default: "text-[0.9rem] pt-2 pb-2.5  font-semibold",
				sm: "px-4 h-9 text-xs font-medium",
				lg: "h-11 px-8 pt-2.5 pb-3 rounded-3xl",
				md: "h-9 rounded-md text-[0.9rem] pt-2.5 pb-3  font-medium",
				xs: "p-2 text-xs",
				icon: "h-48 w-48",
				play: "btn-playicon",
				playSmall: "btn-playicon-sm ",
				playLarge: "btn-playicon-lg",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
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
	variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "play" | "icon";
	size?: "default" | "sm" | "xs" | "md" | "lg" | "playLarge" | "playSmall" | "play" | "icon";
	asChild?: boolean;
	icon?: React.ReactNode;
}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}>
			{variant === "play" && icon ? icon : children}
		</Comp>
	);
}

export { Button, buttonVariants };
