"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
			<Label className="text-base font-semibold">Audio Summary Duration</Label>
			<RadioGroup value={value} onValueChange={handleChange} disabled={disabled}>
				{(
					Object.entries(SUMMARY_LENGTH_OPTIONS) as Array<
						[SummaryLengthOption, (typeof SUMMARY_LENGTH_OPTIONS)[SummaryLengthOption]]
					>
				).map(([key, config]) => (
					<div
						key={key}
						className={cn(
							"m-0  mt-1 flex  flex-row items-center justify-start px-4 py-0 h-18  md:h-11 gap-3 rounded-lg bg-neutral-800 border transition-color duration-300 ease-in-out relative",
							value === key
								? "bg-blue-950 outline-2 outline-blue-800"
								: "border-border hover:bg-accent/80",
							disabled && "opacity-90 bg-accent-10 cursor-not-allowed"
						)}>
						<RadioGroupItem value={key} id={key} disabled={disabled} className="mt-0" />
						<div className=" items-center h-12 ">
							<Label
								htmlFor={key}
								className={cn(
									"cursor-pointer flex items-around w-full justify-end items-center h-12 gap-4",
									disabled && "cursor-not-allowed"
								)}>
								<span className="font-bold h-2 text-[0.8rem] capitalize w-full">
									{config.label}
								</span>
							</Label>
						</div>
					</div>
				))}
			</RadioGroup>
		</div>
	);
}
