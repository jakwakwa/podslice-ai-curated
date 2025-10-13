"use client"

import * as AvatarPrimitive from "@radix-ui/react-avatar"
import type { VariantProps } from "class-variance-authority"
import type * as React from "react"
import { avatarVariants } from "@/lib/component-variants"
import { cn } from "@/lib/utils"

interface AvatarComponentProps extends React.ComponentProps<typeof AvatarPrimitive.Root>, VariantProps<typeof avatarVariants> { }

function Avatar({ className, size, ...props }: AvatarComponentProps) {
	return <AvatarPrimitive.Root data-slot="avatar" className={cn(avatarVariants({ size }), className)} {...props} />
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square h-full w-full max-h-6 max-w-6 md:max-h-10 md:max-w-10 overflow-hidden rounded-full p-0 m-0", className)} {...props} />
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn("flex h-full max-h-8  items-center md:items-center justify-center rounded-full bg-muted overflow-hidden p-0 m-0 ", className)} {...props} />
}

export { Avatar, AvatarImage, AvatarFallback, type AvatarComponentProps }
