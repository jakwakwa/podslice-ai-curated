"use client"

import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
	className,
	size = "default",
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
	size?: "sm" | "default"
}) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			data-size={size}
			className={cn(
				" border-[#63747c73]  focus-visible:border-accent focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-[#100f14e0] dark:hover:bg-[#000] flex items-center justify-between gap-2 rounded-lg border-1 px-4 py-[17px] whitespace-nowrap shadow-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-12 data-[size=sm]:h-12  *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-200 data-[state=open]:[&>svg]:rotate-180 mr-2 w-full max-w-[180px]",
				className
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="size-4 opacity-70" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	)
}

function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content data-slot="select-content" position={position} {...props} className={cn("bg-transparent z-1000", className)} sideOffset={4}>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cn(
						"p-1 overflow-y-auto cursor-pointer",
						position === "popper" &&
						"bg-[#1D191FE0] py-4 px-2 border-1 border-[#15191DED] rounded-md w-full min-w-[var(--radix-select-trigger-width)] backdrop-blur-[14px] scroll-my-1 flex flex-col gap-1 text-[14px] "
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	)
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return <SelectPrimitive.Label data-slot="select-label" className={cn(" my-1.5 px-2 py-2.5  text-[0.5rem] ", className)} {...props} />
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"font-medium hover:bg-[#19515D] hover:rounded-sm hover:text-accent-foreground cursor-pointer rounded-sm px-2 py-1.5 transition-colors",
				className
			)}
			{...props}
		>
			<div className="absolute right-2 flex size-8 items-center justify-center display-none   text-[1px] ">
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="size-4 font-medium text-[0.1rem] " />
				</SelectPrimitive.ItemIndicator>
			</div>
			<SelectPrimitive.ItemText className="font-semibold text-[0.1rem]  ">{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	)
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return <SelectPrimitive.Separator data-slot="select-separator" className={cn("bg-bord-dark pointer-events-none -mx-1 my-2", className)} {...props} />
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton data-slot="select-scroll-up-button" className={cn("flex cursor-default items-center justify-center", className)} {...props}>
			<ChevronUpIcon className="size-4" />
		</SelectPrimitive.ScrollUpButton>
	)
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton data-slot="select-scroll-down-button" className={cn("flex cursor-default items-center justify-center  gap-1 py-1", className)} {...props}>
			<ChevronDownIcon className="size-4" />
		</SelectPrimitive.ScrollDownButton>
	)
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue }
