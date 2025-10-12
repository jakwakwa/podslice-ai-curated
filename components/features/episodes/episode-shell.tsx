import type { ReactElement, ReactNode } from "react";

interface EpisodeShellProps {
	children: ReactNode;
	className?: string;
}

export default function EpisodeShell({ children, className }: EpisodeShellProps): ReactElement {
	const base = "mt-0 episode-shell w-fit  mx-auto rounded-3xl";
	return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}

