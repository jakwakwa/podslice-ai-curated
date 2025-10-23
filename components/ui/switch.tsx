"use client";

import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { switchVariants } from "@/lib/component-variants";
import { cn } from "@/lib/utils";

interface SwitchProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof switchVariants> {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
	({ className, variant, checked = false, onCheckedChange, disabled, ...props }, ref) => {
		const handleClick = () => {
			if (!disabled && onCheckedChange) {
				onCheckedChange(!checked);
			}
		};

		return (
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				disabled={disabled}
				onClick={handleClick}
				data-state={checked ? "checked" : "unchecked"}
				className={cn(switchVariants({ variant }), className)}
				ref={ref}
				{...props}>
				<span
					className="pointer-events-none block h-5 w-5 rounded-full bg-background/20  shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
					data-state={checked ? "checked" : "unchecked"}
				/>
			</button>
		);
	}
);
Switch.displayName = "Switch";

export { Switch, type SwitchProps };
