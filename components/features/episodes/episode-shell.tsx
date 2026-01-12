import type { ReactElement, ReactNode } from "react";

interface EpisodeShellProps {
	children: ReactNode;
	className?: string;
}

export default function EpisodeShell({
	children,
	className,
}: EpisodeShellProps): ReactElement {
	const base =
		"bg-zinc-800 md:bg-zinc-800/20 p-4 m-0 overflow-hidden w-full md:p-12 rounded-sm md:mx-auto";
	return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
