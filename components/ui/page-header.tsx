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
		<div className="my-0 pt-12 pb-9 md:pt-4 md:pb-0 md:px-8  h-fit lg:pt-6 lg:pb-12 shadow-sm  rounded-none  outline-none w-screen md:bg-secondary  relative border-b-none  md:rounded-b-3xl md:border-l-10 md:border-border  md:rounded-3xl p-6 flex flex-col  shadow-slate-700/30 md:shadow-lg justify-between gap-2 md:w-full mb-0 md:mb-0 md:flex-row lg:rounded-3xl    md:shadow-slate-900/20 md:items-center md:justify-between ">
			<div className="flex flex-col justify-center w-full gap-3">



				<h2 className="flex flex-col w-full text-xl  lg:text-2xl font-bold px-0 md:px-0 pt-0 pb-0 md:py-0  text-secondary-foreground leading-[1.5] lg:max-w-2xl lg:py-1 capitalize ">{title}</h2>
				{description && (
					<Typography
						as="p"
						variant="body"
						className="text-base font-medium md:text-[1rem] p-0  md:px-0  md:py-1  text-secondary-foreground-muted leading-[1.4] max-w-screen  w-full md:max-w-[97%] lg:text-base  lg:max-w-2xl">
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
