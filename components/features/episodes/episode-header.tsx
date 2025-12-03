import { ExternalLink } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type BaseHeaderProps = {
	title: string;
	createdAt: Date | string | number;
	durationSeconds?: number | null;
	metaBadges?: ReactNode; // additional badges to inject
	rightLink?: { href: string; label: string; external?: boolean } | null;
};

export default function EpisodeHeader({
	title,
	createdAt,
	durationSeconds,
	metaBadges,
	rightLink,
}: BaseHeaderProps): ReactElement {
	const created = new Date(createdAt);
	const durationMin = durationSeconds ? Math.round(durationSeconds / 60) : null;
	return (
		<div className="pt-12 flex flex-col gap-2">
			<div className="text-primary-foreground-muted text-xl font-bold text-shadow-md text-shadow-slate-900/10 lg:text-shadow-slate-800 lg:text-shadow-md md:text-5xl capitalize">
				{title}
			</div>
			<div className="text-sm text-[#8A97A5D4]/80 episode-p pr-[10%] mb-1">
				<div className="flex flex-wrap items-center gap-2 my-2">
					{durationMin ? <Badge variant="secondary">{durationMin} min</Badge> : null}
					<Badge variant="default">{created.toLocaleString()}</Badge>
					{metaBadges}
					{rightLink ? (
						<div className="text-xs  break-words border *:rounded px-2 py-0 flex rounded-sm gap-2 p-1 text-[#fff] outline-destructive-foreground-muted bg-destructive/70 items-center">
							<a
								className="no-underline text-white hover:underline"
								href={rightLink.href}
								target={rightLink.external ? "_blank" : undefined}
								rel={rightLink.external ? "noreferrer" : undefined}>
								{rightLink.label}
							</a>
							{rightLink.external ? (
								<span className="font-medium  uppercase text-[0.6rem] text-white">
									<ExternalLink width={13} />
								</span>
							) : null}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
