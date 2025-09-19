import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"relative rounded-xl z-0 text-card-foreground shadow",
			className
		)}
		{...props}
	/>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("mb-0", className)}
		{...props}
	/>
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("font-semibold tracking-normal leading-5.5 pr-[20%]", className)}
		{...props}
	/>
))
CardTitle.displayName = "CardTitle"
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	({ className, ...props }, ref) => (
		<p ref={ref} className={cn("text-sm text-[#8A97A5D4]/80 episode-p pr-[10%] mb-1", className)} {...props} />
	)
);
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("flex gap-4 py-3 px-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardAction = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("absolute top-8 hover:bg-card/90 cursor-pointer flex justify-center rounded-full col-start-2 row-span-2 row-start-1 self-start justify-self-end p-2 w-12 hover:translate-y-0.5  transition-all duration-200",
			className)}
		{...props}
	/>
))

const CardFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("flex items-center p-6 pt-0", className)}
		{...props}
	/>
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardAction }
