"use client";

import { Badge } from "@/components/ui/badge";
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
		<div className="space-y-1 p-0">
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
							"flex items-center justify-between w-full px-3 py-1 gap-3 rounded-lg bg-cyan-700/10 border transition-colors h-30 duration-300 ease-in-out",
							value === key
								? "bg-accent/10 border-2 border-cyan-300"
								: "border-border hover:bg-accent/80",
							disabled && "opacity-50 bg-accent-10 cursor-not-allowed"
						)}>
						<RadioGroupItem value={key} id={key} disabled={disabled} className="mt-1" />
						<div className="flex-1 space-y-1">
							<Label
								htmlFor={key}
								className={cn(
									"cursor-pointer flex items-center gap-2",
									disabled && "cursor-not-allowed"
								)}>
								<span className="font-bold">{config.label}</span>
								{key === "LONG" && (
									<Badge variant="outline" className="text-xs">
										2x Credits
									</Badge>
								)}
							</Label>
							<p className="text-sm text-muted-foreground">
								~{config.minutes[0]}-{config.minutes[1]} minutes • {config.description}
							</p>
						</div>
					</div>
				))}
			</RadioGroup>
		</div>
	);
}
