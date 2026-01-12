import type React from "react";

interface CommonSectionWithChildrenProps {
	children: React.ReactNode;
	title: string;
	description: string;
}

const CommonSectionWithChildren = ({ children }: CommonSectionWithChildrenProps) => {
	return (
		<div className="w-full border-none rounded-none overflow-hidden mb-0 p-0  mt-0 md:mt-4 md:m-0  md:py-8  outline-0 md:rounded-4xl md:shadow-xl py-8 bg-black">
			<div className="w-full text-left pt-8 rounded-none  mb-5 pb-7 overflow-hidden md:rounded-4xl  md:py-0 min-w-full min-h-full">
				{children}
			</div>
		</div>
	);
};

export { CommonSectionWithChildren as default };
