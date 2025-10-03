"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { avatarVariants } from "@/lib/component-variants";
import { cn } from "@/lib/utils";

interface AvatarComponentProps extends React.ComponentProps<typeof AvatarPrimitive.Root>, VariantProps<typeof avatarVariants> {}

function Avatar({ className, size, ...props }: AvatarComponentProps) {
	return <AvatarPrimitive.Root data-slot="avatar" className={cn(avatarVariants({ size }), className)} {...props} />;
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square h-full w-full", className)} {...props} />;
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props} />;
}

export { Avatar, AvatarImage, AvatarFallback, type AvatarComponentProps };
