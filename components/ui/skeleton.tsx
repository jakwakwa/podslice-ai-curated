import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("animate-pulse h-800 w-full rounded-md bg-card", className)} {...props} />;
}

export { Skeleton };
