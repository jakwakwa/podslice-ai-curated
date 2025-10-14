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

export default function EpisodeHeader({ title, createdAt, durationSeconds, metaBadges, rightLink }: BaseHeaderProps): ReactElement {
	const created = new Date(createdAt);
	const durationMin = durationSeconds ? Math.round(durationSeconds / 60) : null;
	return (
		<div className="flex flex-col gap-2">
			<div className="text-primary-foreground text-xl font-bold text-shadow-sm text-shadow-slate-900/30 md:text-5xl capitalize">{title}</div>
			<div className="text-sm text-[#8A97A5D4]/80 episode-p pr-[10%] mb-1">
				<div className="flex flex-wrap items-center gap-2 my-2">
					{durationMin ? <Badge variant="secondary">{durationMin} min</Badge> : null}
					<Badge variant="secondary">{created.toLocaleString()}</Badge>
					{metaBadges}
					{rightLink ? (
						<div className="text-xs text-muted-foreground break-words border-1 border-[#dcd4df36] rounded px-2 py-0 flex gap-2 items-center">
							<a className="no-underline hover:underline" href={rightLink.href} target={rightLink.external ? "_blank" : undefined} rel={rightLink.external ? "noreferrer" : undefined}>
								{rightLink.label}
							</a>
							{rightLink.external ? (
								<span className="font-medium uppercase text-[0.6rem] text-[#9be5c9]">
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
