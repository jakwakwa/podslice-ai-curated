"use client";

import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Separator({ className, orientation = "horizontal", decorative = true, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
	return (
		<SeparatorPrimitive.Root
			data-slot="separator"
			decorative={decorative}
			orientation={orientation}
			className={cn("bg-[#0000002d] shrink-0 data-[orientation=horizontal]:h-[1.5px] data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-1 data-[orientation=vertical]:w-px", className)}
			{...props}
			style={{

				boxShadow: "0px -1px 0px 0px rgb(0 0 0,0.7) !important"
			}}
		/>
	);
}

export { Separator };
