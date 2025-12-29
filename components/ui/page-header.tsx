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
			<div className="w-full h-24 rounded-2xl bg-gradient-to-r from-[#1E1B26] to-[#16151A] flex items-center px-8 border border-zinc-800 mb-8">
				<div className="flex items-center justify-between w-full">
					<h1 className="text-2xl font-semibold text-slate-200">{title}</h1>
					{description && (
						<Typography
							as="p"
							variant="body"
							className="text-sm text-zinc-400 hidden md:block">
							{description}
						</Typography>
					)}
					{button && <div className="flex items-center">{button}</div>}
				</div>
			</div>
		);
	}
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
