"use client";

import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { type HeaderProps, headerVariants } from "@/lib/component-variants";
import { useSubscriptionStore } from "@/lib/stores/subscription-store-paddlejs";
import { cn } from "@/lib/utils";
import { hasCurateControlAccess } from "@/utils/paddle/plan-utils";
import { H1, H2, H3, Typography } from "./typography";

interface PageHeaderProps extends React.HTMLAttributes<HTMLElement>, HeaderProps {
	title: string;
	description?: string;
	level?: 1 | 2 | 3;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(({ className, spacing, title, description, level = 1, ...props }, ref) => {
	const _HeadingComponent = level === 1 ? H1 : level === 2 ? H2 : H3;
	const _router = useRouter();
	const pathname = usePathname();
	const subscription = useSubscriptionStore(state => state.subscription);
	const _isLoading = useSubscriptionStore(state => state.isLoading);

	// Check if user has Curate Control access
	const _hasAccess = hasCurateControlAccess(subscription?.plan_type);

	// Define allowed paths internally - only show button on dashboard
	const allowedPaths = ["/dashboard"];
	const _isPathAllowed = allowedPaths.includes(pathname);

	return (
		<div className="backdrop-blur-lg bg-[#764bc652] shadow  border-1 rounded-2xl px-2 flex flex-col justify-between">
			<div className={cn(headerVariants({ spacing, className }))} ref={ref} {...props}>
				<h2 className="flex text-xl font-bold px-2 md:px-0 pt-0 pb-0 md:py-0 text-shadow-sm text-primary-foreground leading-[1.5] max-w-screen lg:max-w-4xl">{title}</h2>
				{description && (
					<Typography as="p" variant="body" className="text-sm px-2  md:px-0  md:py-1.5 text-primary-foreground/60 leading-[1.5] max-w-screen  text-shadow-md font-medium w-full md:max-w-[57%]">
						{description}
					</Typography>
				)}
			</div>
		</div>
	);
});
PageHeader.displayName = "PageHeader";

export { PageHeader };
