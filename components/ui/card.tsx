import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			" max-w-[100%] my-0 relative rounded-xl z-0 text-card-foreground shadow w-screen md:w-full mx-auto",
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
		className={cn("text-[0.8rem] font-semibold tracking-normal md:text-[1rem] md:leading-5 pr-[20%] text-shadow text-shadow-md text-[#acf3ebe9]", className)}
		{...props}
	/>
))
CardTitle.displayName = "CardTitle"
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	({ className, ...props }, ref) => (
		<p ref={ref} className={cn(" text-[#ececece9] pr-[10%] mb-1", className)} {...props} />
	)
);
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("flex gap-3 py-8 px-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardAction = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("absolute top-4 sm:top-2 md:top-2 cursor-pointer flex justify-center rounded-full col-start-2 row-span-2 row-start-1 self-start justify-self-end p-2 w-10 lg:w-12 z-10 transition-all duration-200",
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
