import type React from "react";
import SectionHeader from "./section-header";
import { PageHeader } from "../ui/page-header";

interface CommonSectionWithChildrenProps {
	children: React.ReactNode;
	title: string;
	description: string;
}

const CommonSectionWithChildren = ({
	children,
	title,
	description,
}: CommonSectionWithChildrenProps) => {
	return (
		<div className="border-none rounded-none overflow-hidden mb-0 p-0  mt-0 md:mt-4 md:m-0  md:p-0  outline-0 md:rounded-4xl md:shadow-xl">
			<div className="text-left pt-8 rounded-none  mb-5 pb-7 overflow-hidden md:rounded-4xl  md:py-0 min-w-full min-h-full bg-primary/70  ">

				{children}
			</div>
		</div>
	);
};

export { CommonSectionWithChildren as default };
