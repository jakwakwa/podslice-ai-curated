import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				className={cn(
					"bg-input/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm text-shadow-black/10  transition-colors file:border-1 border-slate-700/40 shadow-inner-md  shadow-[0_2px_4px_1px_inset] shadow-slate-950/20 file:text-sm file:font-medium text-primary-foreground placeholder:text-primary-foreground/60 active:ring disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 md:text-sm",
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
