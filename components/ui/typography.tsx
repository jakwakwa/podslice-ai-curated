import React from "react";
import { type TypographyProps, typographyVariants } from "@/lib/component-variants";
import { cn } from "@/lib/utils";

interface TypographyComponent extends React.HTMLAttributes<HTMLElement>, TypographyProps {
	as?: "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span" | "div";
}

const Typography = React.forwardRef<HTMLElement, TypographyComponent>(({ className, variant, as: Component = "p", ...props }, ref) => {
	return React.createElement(Component, {
		className: cn(typographyVariants({ variant, className })),
		ref,
		...props,
	});
});
Typography.displayName = "Typography";

// Pre-configured heading components
const H1 = (props: Omit<TypographyComponent, "variant" | "as">) => <Typography variant="h1" as="h1" {...props} />;

const H2 = (props: Omit<TypographyComponent, "variant" | "as">) => <Typography variant="h2" as="h2" {...props} />;

const H3 = (props: Omit<TypographyComponent, "variant" | "as">) => <Typography variant="h3" as="h3" {...props} />;

const H4 = (props: Omit<TypographyComponent, "variant" | "as">) => <Typography variant="h4" as="h4" {...props} />;

const H5 = (props: Omit<TypographyComponent, "variant" | "as">) => <Typography variant="h5" as="h5" {...props} />;

// Body text components
const Body = (props: Omit<TypographyComponent, "variant" | "as">) => <Typography variant="body" as="p" {...props} />;

const Muted = (props: Omit<TypographyComponent, "variant" | "as">) => <Typography variant="muted" as="p" {...props} />;

const _Span = (props: Omit<TypographyComponent, "variant" | "as">) => <Typography variant="muted" as="span" {...props} />;

export { Typography, H1, H2, H3, H4, H5, Body, Muted };
