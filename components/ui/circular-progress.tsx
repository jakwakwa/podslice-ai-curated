import { cn } from "@/lib/utils";

interface CircularProgressProps {
	value: number;
	size?: number;
	strokeWidth?: number;
	className?: string;
	trackClassName?: string;
	indicatorClassName?: string;
	showValue?: boolean;
	valueClassName?: string;
}

export function CircularProgress({
	value,
	size = 40,
	strokeWidth = 4,
	className,
	trackClassName,
	indicatorClassName,
	showValue = true,
	valueClassName,
}: CircularProgressProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const offset = circumference - (value / 100) * circumference;

	return (
		<div
			className={cn("relative flex items-center justify-center", className)}
			style={{ width: size, height: size }}>
			<svg className="transform -rotate-90 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
				{/* Track */}
				<circle
					className={cn("text-zinc-800", trackClassName)}
					stroke="currentColor"
					fill="transparent"
					strokeWidth={strokeWidth}
					r={radius}
					cx={size / 2}
					cy={size / 2}
				/>
				{/* Indicator */}
				<circle
					className={cn(
						"text-violet-500 transition-all duration-500 ease-in-out",
						indicatorClassName
					)}
					stroke="currentColor"
					fill="transparent"
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					r={radius}
					cx={size / 2}
					cy={size / 2}
				/>
			</svg>
			{showValue && (
				<div
					className={cn(
						"absolute inset-0 flex items-center justify-center text-[10px] font-bold",
						valueClassName
					)}>
					{Math.round(value)}%
				</div>
			)}
		</div>
	);
}
