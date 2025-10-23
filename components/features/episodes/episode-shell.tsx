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
		"bg-episode-shell mt-0 p-5 md:p-12 w-fit mt-1 rounded-sm mx-auto md:rounded-4xl";
	return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
