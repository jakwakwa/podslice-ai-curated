import type React from "react";
import { cn } from "@/lib/utils";

interface AboutSectionProps {
	title: string;
	children: React.ReactNode;
	className?: string;
}

export default function AboutSection({ title, children, className }: AboutSectionProps) {
	return (
		<section
			className={cn("py-16 bg-bigcard md:py-24 px-4 mx-auto max-w-[100vw]", className)}>
			<div className="max-w-7xl mx-auto">
				<h2 className="text-3xl  md:text-2xl lg:text-4xl font-bold text-center text-primary-foreground mb-12">
					{title}
				</h2>
				{children}
			</div>
		</section>
	);
}
