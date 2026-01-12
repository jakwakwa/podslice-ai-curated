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
	title: ReactNode;
	children: ReactNode;
	className?: string;
	openValue?: string;
	onOpenChange?: (value: string) => void;
}

export function FormAccordion({
	value,
	title,
	children,
	className,
	openValue,
	onOpenChange,
}: FormAccordionProps) {
	return (
		<Accordion
			type="single"
			collapsible
			value={openValue}
			onValueChange={onOpenChange}
			className={cn(
				"bg-[#16191d] rounded-2xl w-full border border-zinc-800 transition-all duration-200 hover:border-zinc-700",
				className
			)}>
			<AccordionItem value={value} className="border-none">
				<AccordionTrigger className="px-5 py-5 font-semibold hover:no-underline text-base text-slate-200">
					{title}
				</AccordionTrigger>
				<AccordionContent className="px-5 pb-6">{children}</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
