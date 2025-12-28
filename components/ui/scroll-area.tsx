"use client";

import * as scrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
	React.ElementRef<typeof scrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof scrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
	<scrollAreaPrimitive.Root
		ref={ref}
		className={cn("relative overflow-hidden", className)}
		{...props}>
		<scrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
			{children}
		</scrollAreaPrimitive.Viewport>
		<ScrollBar />
		<scrollAreaPrimitive.Corner />
	</scrollAreaPrimitive.Root>
));
ScrollArea.displayName = scrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
	React.ElementRef<typeof scrollAreaPrimitive.Scrollbar>,
	React.ComponentPropsWithoutRef<typeof scrollAreaPrimitive.Scrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
	<scrollAreaPrimitive.Scrollbar
		ref={ref}
		orientation={orientation}
		className={cn(
			"flex touch-none select-none transition-colors",
			orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
			orientation === "horizontal" &&
				"h-2.5 flex-col border-t border-t-transparent p-[1px]",
			className
		)}
		{...props}>
		<scrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
	</scrollAreaPrimitive.Scrollbar>
));
ScrollBar.displayName = scrollAreaPrimitive.Scrollbar.displayName;

export { ScrollArea, ScrollBar };
