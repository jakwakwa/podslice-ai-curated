import type { ReactElement, ReactNode } from "react";

interface EpisodeShellProps {
	children: ReactNode;
	className?: string;
}

export default function EpisodeShell({ children, className }: EpisodeShellProps): ReactElement {
	const base = "mt-12 episode-card-wrapper p-12 w-full max-w-5xl mx-auto space-y-6 pr-0 md:max-w-[80%]";
	return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
