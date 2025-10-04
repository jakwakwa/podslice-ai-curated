"use client"

import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"
import type * as React from "react"

import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"flex size-[15px] bg-[#00000053] appearance-none items-center justify-center rounded shadow-[0_2px_10px] shadow-secondary outline-2 outline-ring 3 mr-4  hover:bg-violet3 focus:shadow-[0_0_0_2px_var(--color-primary)]",
				className
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex items-center justify-center text-current transition-none">
				<CheckIcon size="14" color="turquoise" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	)
}

export { Checkbox }
