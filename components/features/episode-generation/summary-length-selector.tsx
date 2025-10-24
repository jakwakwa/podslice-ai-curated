"use client";

import { InfoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
	SUMMARY_LENGTH_OPTIONS,
	type SummaryLengthOption,
} from "@/lib/types/summary-length";
import { cn } from "@/lib/utils";

interface SummaryLengthSelectorProps {
	value: SummaryLengthOption;
	onChange: (value: SummaryLengthOption) => void;
	onLongOptionSelect: () => void;
	disabled?: boolean;
}

export function SummaryLengthSelector({
	value,
	onChange,
	onLongOptionSelect,
	disabled = false,
}: SummaryLengthSelectorProps) {
	const handleChange = (newValue: SummaryLengthOption) => {
		if (newValue === "LONG") {
			onLongOptionSelect();
		} else {
			onChange(newValue);
		}
	};

	return (
		<div className=" p-0">
			<Label className="text-base font-semibold">Episode Length</Label>
			<RadioGroup value={value} onValueChange={handleChange} disabled={disabled}>
				{(
					Object.entries(SUMMARY_LENGTH_OPTIONS) as Array<
						[SummaryLengthOption, (typeof SUMMARY_LENGTH_OPTIONS)[SummaryLengthOption]]
					>
				).map(([key, config]) => (
					<div
						key={key}
						className={cn(
							"flex items-center justify-start content-center px-4 py-1  h-12 gap-4 rounded-lg bg-cyan-700/10 border transition-color duration-300 ease-in-out",
							value === key
								? "bg-accent/10 outline-1 outline-violet-700"
								: "border-border hover:bg-accent/80",
							disabled && "opacity-50 bg-accent-10 cursor-not-allowed"
						)}>
						<RadioGroupItem value={key} id={key} disabled={disabled} className="mt-0" />
						<div className=" items-center h-12 ">
							<Label
								htmlFor={key}
								className={cn(
									"cursor-pointer flex content-center items-center h-12 gap-4",
									disabled && "cursor-not-allowed"
								)}>
								<span className="font-bold h-3">{config.label}</span>
								{key === "LONG" && (
									<Badge variant="outline" className="text-xs h-4">
										2x Credits
									</Badge>
								)}
								<Tooltip>
									<TooltipTrigger>
										<InfoIcon className="text-sm" />
										<span className="hidden">Hover</span>
									</TooltipTrigger>
									<TooltipContent className="bg-white ">
										<p className="text-sm text-muted cursor-default ">
											~{config.minutes[0]}-{config.minutes[1]} minutes •{" "}
											{config.description}
										</p>
									</TooltipContent>
								</Tooltip>
							</Label>
						</div>
					</div>
				))}
			</RadioGroup>
		</div>
	);
}
