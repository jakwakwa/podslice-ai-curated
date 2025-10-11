"use client";

import { usePathname, useRouter } from "next/navigation";
import React from "react";
import type { HeaderProps } from "@/lib/component-variants";
import { useSubscriptionStore } from "@/lib/stores/subscription-store-paddlejs";
import { hasCurateControlAccess } from "@/utils/paddle/plan-utils";
import { H1, H2, H3, Typography } from "./typography";

interface PageHeaderProps extends React.HTMLAttributes<HTMLElement>, HeaderProps {
	title: string;
	description?: string;
	level?: 1 | 2 | 3;
	button?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(({ title, description, level = 1, button }, _ref) => {
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
		<div className="my-0 pt-8 md:pt-4 md:px-8 shadow-sm bg-secondary  relative border-b-none rounded-b-none md:rounded-b-3xl md:border-l-10 md:border-b-none md:border-border rounded-none md:rounded-3xl p-6 flex flex-col  justify-between gap-8 w-full mb-0 md:mb-3 md:flex-row lg:rounded-3xl md:shadow-lg   shadow-slate-950/50 md:justify-between overflow-hidden ">
			<div className="flex flex-col justify-center w-full">



				<h2 className="flex flex-col w-full  text-xl font-bold px-0 md:px-0 pt-0 pb-0 md:py-0 text-shadow-md text-secondary-foreground leading-[1.5] max-w-screen lg:max-w-2xl lg:text-xl lg:py-2 lg:uppercase ">{title}</h2>
				{description && (
					<Typography
						as="p"
						variant="body"
						className="text-sm md:text-[0.9rem] px-0  md:px-0  md:py-1  text-secondary-foreground-muted leading-[1.4] max-w-screen  text-shadow-sm font-normal w-full md:max-w-[97%] lg:text-base  lg:max-w-2xl">
						{description}
					</Typography>
				)}
			</div>


			{button && (
				<div className="flex flex-col md:justify-center md:items-end  w-[320px]">
					{button}
				</div>
			)}
		</div>
	);
});
PageHeader.displayName = "PageHeader";

export { PageHeader };
