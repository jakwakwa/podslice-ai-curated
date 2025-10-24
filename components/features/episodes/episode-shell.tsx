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
		"bg-episode-shell mt4xl-0 p-5 md:p-12 w-fit rounded-sm mx-auto";
	return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
