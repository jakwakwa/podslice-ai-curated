import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TogglePillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	isActive: boolean;
}

export function TogglePill({ isActive, className, children, ...props }: TogglePillProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			className={cn(
				"px-6 py-2.5 rounded-full text-sm transition-all h-auto",
				isActive
					? "bg-violet-500 text-white font-semibold hover:bg-violet-600 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] shadow-[0_0_15px_rgba(168,85,247,0.2)]"
					: "bg-transparent border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-transparent",
				className
			)}
			{...props}>
			{children}
		</Button>
	);
}
