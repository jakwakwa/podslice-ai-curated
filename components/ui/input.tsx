
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				className={cn(
					"bg-input/50 flex min-h-12 w-full rounded-lg border px-3 py-1 text-sm text-shadow-black/10  file:focus:text-sidebar-ring transition-colors file:border-1 border-input-border shadow-inner-md  shadow-[0_2px_4px_1px_inset] shadow-slate-950/20 file:text-sm file:font-medium text-primary-foreground focus:text-sidebar  active:text-sidebar-ring  placeholder:text-input-placeholder active:ring disabled:cursor-not-allowed focus-visible:outline-ring-2 focus-visible:outline-ring disabled:opacity-50 md:text-sm  not-focus-visible:outline-none input-selection:bg-input-ring selection:text-input-ring",
					className
				)}
				ref={ref}
				{...props}
			/>
		)
	}
)
Input.displayName = "Input"

export { Input }
