import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("animate-pulse bg-gray-900 h-800 w-full rounded-md", className)}
			{...props}
		/>
	);
}

export { Skeleton };
