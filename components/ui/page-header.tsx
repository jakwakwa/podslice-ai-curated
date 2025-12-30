"use client";

import React from "react";
import type { HeaderProps } from "@/lib/component-variants";

import { H1, H2, H3 } from "./typography";

interface PageHeaderProps extends React.HTMLAttributes<HTMLElement>, HeaderProps {
	title: string;
	description?: string;
	level?: 1 | 2 | 3;
	button?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
	({ title, level = 1, button }, _ref) => {
		const _HeadingComponent = level === 1 ? H1 : level === 2 ? H2 : H3;

		return (
			<div className="w-full py-5 h-fit px-8 backdrop-filter-sm flex items-center rounded-2xl bg-linear-to-r from-[#1E1B26]/80 to-[#1E1B26]/70 border-[0.5px] border-black">
				<div className="flex h-full  w-full items-center flex-row justify-between">
					<h1 className="text-2xl font-semibold w-fit leading-normal text-slate-200">
						{title}
					</h1>
					{button && <div>{button}</div>}
				</div>
			</div>
		);
	}
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
