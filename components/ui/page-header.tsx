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
	button?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(({ className, spacing, title, description, level = 1, button, ...props }, ref) => {
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
		<div className="my-0 pt-3 md:pt-4 backdrop-blur-lg bg-[#1f153053] relative md:border-l-10 rounded-md px-2  flex flex-col border-l-0 border-l-[#4841a76c] justify-between  mb-0 md:mb-3 lg:mb-6 shadow-slate-900/40 shadow-xl">
			<div className={cn(headerVariants({ spacing, className }))} ref={ref} {...props}>
				<h2 className="flex text-xl font-bold px-0 md:px-0 pt-0 pb-0 md:py-0 text-shadow-md text-shadow-[#3f365e6a] text-[#afb7db] leading-[1.5] max-w-screen lg:max-w-4xl">{title}</h2>
				{description && (
					<Typography as="p" variant="body" className="text-sm md:text-[0.9rem] px-0  md:px-0  md:py-1 text-[#999cbb] leading-[1.5] max-w-screen  text-shadow-sm text-shadow-[#00000010] font-medium w-full md:max-w-[97%]">
						{description}
					</Typography>
				)}
				{button && (
					<div className="flex justify-end absolute right-4 top-8	">
						{button}
					</div>
				)}
			</div>
		</div>
	);
});
PageHeader.displayName = "PageHeader";

export { PageHeader };
