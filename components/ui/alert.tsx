import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground", {
	variants: {
		variant: {
			default: "backdrop-blur-sm bg-[#432b6c46] shadow shadow-[0_4px_30px_-4px_rgba(0, 0, 0, 0.916)] p-8 text-foreground rounded-3xl border-3 border-[#4f6d99b4] mt-1 text-primary-foreground max-w-lg",
			destructive: " bg-[#b002b099] shadow shadow-[0_4px_30px_-4px_rgba(10, 192, 147, 0.143)] p-8 rounded-3xl border-[#ee4ad8b4] text-red-foreground bg-[#b91a5229]",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(({ className, variant, ...props }, ref) => (
	<div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
	<h5
		ref={ref}
		className={cn("flex gap-2 py-0 text-lg font-sans font-semibold mb-0 leading-none tracking-normal text-shadow text-shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-[#94c9e5]", className)}
		{...props}
	/>
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("text-sm  text-[#a3e1e797]  py-1 [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
