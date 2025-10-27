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

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
	({ title, description, level = 1, button }, _ref) => {
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
			<div className="min-w-screen sm:-ml-8 md:min-w-full md:mx-0 sm:-mt-4 pb-18 md:ml-0 my-0 pt-12 mx-0  px-5  md:px-8  h-fit lg:pt-6 lg:pb-4 shadow-sm bg-sidebar-ring/10  rounded-none  max-w-full outline-none w-screen  relative border-b-none md:rounded-2xl md:border-1 md:border-border/50 p-6 flex flex-col  justify-between gap-2 md:w-full mb-0 md:mb-0 md:flex-row sm:pb-12   md:shadow-foreground-muted/80 lg:shadow-xl md:items-center md:justify-between lg:mb-0 xl:py-10 md:mt-2 md:py-8 md:pb-8">
				<div className="flex flex-col justify-center w-full gap-3">
					<h2 className="flex flex-col w-full text-2xl xl:text-4xl md:text-lg   lg:text-2xl font-bold px-0 md:px-0 pt-0 pb-0 md:py-0  text-primary-foreground-muted leading-tight lg:max-w-2xl lg:my-0 title-case ">
						{title}
					</h2>
					{description && (
						<Typography
							as="p"
							variant="body"
							className="text-base font-medium md:text-[1rem] p-0  md:px-0  md:py-0  text-primary-foreground leading-normal max-w-screen  w-full md:max-w-[97%] lg:text-base  lg:max-w-2xl">
							{description}
						</Typography>
					)}
				</div>

				{button && (
					<div className="flex flex-col md:justify-center md:items-end">{button}</div>
				)}
			</div>
		);
	}
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
