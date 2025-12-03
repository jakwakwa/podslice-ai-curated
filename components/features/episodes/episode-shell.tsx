import type { ReactElement, ReactNode } from "react";

interface EpisodeShellProps {
	children: ReactNode;
	className?: string;
}

export default function EpisodeShell({
	children,
	className,
}: EpisodeShellProps): ReactElement {
	const base = "bg-episode-shell m-0 overflow-hidden p-5 md:p-12 rounded-sm md:mx-auto";
	return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
