import { RefreshCw } from "lucide-react";
import { type SpinnerProps, spinnerVariants } from "@/lib/component-variants";
import { cn } from "@/lib/utils";

export interface AppSpinnerProps extends SpinnerProps {
	/** Optional label text to display below the spinner */
	label?: string;
	/** Color theme of the label text */
	labelColor?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
	/** Additional className for the base wrapper */
	className?: string;
}

export function AppSpinner({ label, size = "sm", color = "primary", variant = "dots", labelColor = "default", className }: AppSpinnerProps) {
	const getLabelColorClass = (labelColor: string) => {
		switch (labelColor) {
			case "primary":
				return "text-[#fff] text-center";
			case "secondary":
				return "text-[#fff] text-center ";
			case "success":
				return "text-teal-500 text-center";
			case "warning":
				return "text-amber-500 text-center";
			case "danger":
				return "text-red-500 text-center";
			default:
				return "text-[#fff] text-center";
		}
	};

	const renderSpinner = () => {
		const baseClasses = cn(spinnerVariants({ size, color, variant }));

		switch (variant) {
			case "gradient":
				return (
					<div className={cn("relative", baseClasses)}>
						<div
							className=" h-full border-2 border-transparent rounded-full animate-spin bg-gradient-conic from-transparent via-current to-transparent"
							style={{ background: "conic-gradient(from 0deg, transparent, currentColor, transparent)" }}
						/>
						<div className="absolute inset-0.5 bg-background rounded-full h-24 w-24" />
					</div>
				);

			case "wave":
				return (
					<div className={cn("flex gap-1 items-start", baseClasses)}>
						{[...Array(5)].map((_, i) => (
							<div
								key={i}
								className="w-1 h-1 bg-current rounded-full animate-pulse"
								style={{
									animationDelay: `${i * 0.16}s`,
									animationDuration: ".8s",
									animationIterationCount: "infinite",
								}}
							/>
						))}
					</div>
				);

			case "dots":
				return (
					<div className={cn("flex gap-2 m-4 h-8 w-3 items-center", baseClasses)}>
						{[...Array(3)].map((_, i) => (
							<div
								key={i}
								className="w-1 h-1   bg-current rounded-full animate-bounce"
								style={{
									animationDelay: `${i * 0.16}s`,
									animationDuration: "1.4s",
								}}
							/>
						))}
					</div>
				);

			case "spinner":
				return (
					<div className={cn("relative", baseClasses)}>
						{[...Array(12)].map((_, i) => (
							<div
								key={i}
								className="absolute w-0.5 h-1 bg-current rounded-sm left-1/2 top-1/2 origin-bottom animate-pulse"
								style={{
									transform: `rotate(${i * 30}deg) translate(-50%)`,
									animationDelay: `${i * 0.1}s`,
									animationDuration: "1.2s",
								}}
							/>
						))}
					</div>
				);

			default:
				return <RefreshCw className={baseClasses} />;
		}
	};

	return (
		<div className={cn("flex flex-col items-start justify-start gap-3", className)}>
			<div className="flex items-start justify-start">{renderSpinner()}</div>
			{label && <span className={cn("text-xs text-left", getLabelColorClass(labelColor))}>{label}</span>}
		</div>
	);
}
