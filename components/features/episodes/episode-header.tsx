import { ExternalLink } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type BaseHeaderProps = {
	title: string;
	createdAt: Date | string | number;
	durationSeconds?: number | null;
	metaBadges?: ReactNode; // additional badges to inject
	rightLink?: { href: string; label: string; external?: boolean } | null;
	rightAction?: ReactNode;
};

export default function EpisodeHeader({
	title,
	createdAt,
	durationSeconds,
	metaBadges,
	rightLink,
	rightAction,
}: BaseHeaderProps): ReactElement {
	const created = new Date(createdAt);
	const durationMin = durationSeconds ? Math.round(durationSeconds / 60) : null;
	return (
		<div className="pt-8 flex flex-col gap-2">
			<div className="text-primary-foreground-muted text-3xl font-bold text-shadow-md text-shadow-slate-900/10 lg:text-shadow-slate-800 lg:text-shadow-md md:text-5xl capitalize">
				{title}
			</div>
			<div className="text-sm text-[#8A97A5D4]/80 episode-p pr-[10%] mb-1">
				<div className="flex flex-wrap items-center absolute gap-2 mt-4">
					{durationMin ? (
						<Badge className="bg-black text-white outline-1 outline-zinc-700 rounded-sm px-2 h-6 text-[10px] font-normal">
							{durationMin} min
						</Badge>
					) : null}
					<Badge className="bg-black text-white outline-1 outline-zinc-700 rounded-sm px-2 h-6 text-[10px] font-normal">
						{created.toLocaleDateString("en-GB", {
							day: "2-digit",
							month: "short",
							year: "numeric",
						})}
					</Badge>
					{metaBadges}
					{rightLink ? (
						<div className="text-[10px] font-normal wrap-break-word border-0 px-2 h-6 flex rounded-md shadow-md shadow-black/20 gap-1.5 text-white bg-[#932a3d] hover:bg-red-800 cursor-pointer items-center transition-colors">
							<a
								className="no-underline text-white"
								href={rightLink.href}
								target={rightLink.external ? "_blank" : undefined}
								rel={rightLink.external ? "noreferrer" : undefined}>
								{rightLink.label}
							</a>
							{rightLink.external ? (
								<ExternalLink width={10} height={10} className="text-white" />
							) : null}
						</div>
					) : null}
					{rightAction}
				</div>
			</div>
		</div>
	);
}
