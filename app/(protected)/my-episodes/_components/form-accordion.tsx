import type { ReactNode } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface FormAccordionProps {
	value: string;
	title: string;
	children: ReactNode;
	className?: string;
}

export function FormAccordion({ value, title, children, className }: FormAccordionProps) {
	return (
		<Accordion
			type="single"
			collapsible
			className={cn(
				"bg-[#70614d44] mt-6 rounded-xl md:rounded-4xl w-full shadow-md transition-all duration-200 hover:bg-[#110d171f]",
				className
			)}>
			<AccordionItem value={value} className="border-none">
				<AccordionTrigger className="px-4 md:px-10 py-6 font-semibold hover:no-underline text-base text-foreground/90">
					{title}
				</AccordionTrigger>
				<AccordionContent className="px-4 md:px-10 pb-12">{children}</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
