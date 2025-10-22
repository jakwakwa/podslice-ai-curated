"use client";

import { AlertCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SUMMARY_LENGTH_OPTIONS, type SummaryLengthOption } from "@/lib/types/summary-length";
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
		<div className="space-y-3">
			<Label className="text-base font-semibold">Episode Length</Label>
			<RadioGroup value={value} onValueChange={handleChange} disabled={disabled}>
				{(Object.entries(SUMMARY_LENGTH_OPTIONS) as Array<
					[SummaryLengthOption, (typeof SUMMARY_LENGTH_OPTIONS)[SummaryLengthOption]]
				>).map(([key, config]) => (
					<div
						key={key}
						className={cn(
							"flex items-start space-x-3 p-4 rounded-lg border transition-colors",
							value === key ? "border-primary bg-accent" : "border-border hover:bg-accent/50",
							disabled && "opacity-50 cursor-not-allowed"
						)}
					>
						<RadioGroupItem value={key} id={key} disabled={disabled} className="mt-1" />
						<div className="flex-1 space-y-1">
							<Label
								htmlFor={key}
								className={cn(
									"cursor-pointer flex items-center gap-2",
									disabled && "cursor-not-allowed"
								)}
							>
								<span className="font-medium">{config.label}</span>
								{key === "LONG" && (
									<Badge variant="secondary" className="text-xs">
										2x Credits
									</Badge>
								)}
							</Label>
							<p className="text-sm text-muted-foreground">
								~{config.minutes[0]}-{config.minutes[1]} minutes • {config.description}
							</p>
							{key === "LONG" && (
								<div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500">
									<AlertCircle className="h-4 w-4 flex-shrink-0" />
									<span>This option uses 2 of your monthly episode credits</span>
								</div>
							)}
						</div>
					</div>
				))}
			</RadioGroup>
		</div>
	);
}
