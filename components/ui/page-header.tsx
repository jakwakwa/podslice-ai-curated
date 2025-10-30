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
			<div className="min-w-screen sm:-ml-0 sm:pt-8 md:min-w-full md:mx-8s sm:-mt-4 pb-12 md:ml-0 my-0 pt-6 mx-0  px-5  md:px-8  h-fit lg:pt-6 lg:pb-0 shadow-sm bg-gray-800/30 outline-1 backdrop-blur-sm outline-cyan-800/50 rounded-none  max-w-full w-screen  relative border-b-none md:rounded-xl md:border-1 md:border-border/50 p-6 flex flex-col  justify-between gap-3 md:gap-8 md:w-full mb-0 md:mb-0 md:flex-row sm:pb-12   md:shadow-foreground-muted/80 lg:shadow-xl md:items-center md:justify-between lg:mb-0 xl:py-10 md:mt-2 md:py-8 md:pb-8">
				<div className="flex flex-col justify-center w-auto mt-5 md:mt-0 gap-6 ml-2 lg:mx-6">
					<h2 className="flex flex-col w-full text-2xl xl:text-2xl md:text-xl   lg:text-xl font-bold px-0 md:px-0 pt-0 pb-0 md:py-0  text-violet-300 leading-tight lg:max-w-2xl lg:my-0 title-case ">
						{title}
					</h2>
					{description && (
						<Typography
							as="p"
							variant="body"
							className="text-base font-medium md:text-[1rem] p-0  md:px-0  md:py-0  text-primary-foreground/75 leading-normal max-w-screen  w-full md:max-w-[97%] lg:text-base  lg:max-w-2xl lg:mb-2">
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
