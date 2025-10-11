import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				className={cn(
					"bg-input flex h-9 w-full rounded-md border border-input px-3 py-1 text-base shadow-sm transition-colors file:border-0  file:text-sm file:font-medium text-primary-foreground placeholder:text-muted active:ring disabled:cursor-not-allowed focus-visible:outline-1 focus-visible:outline-ring disabled:opacity-50 md:text-sm",
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
