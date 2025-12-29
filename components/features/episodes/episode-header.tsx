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
		<div className="pt-12 flex flex-col gap-2">
			<div className="text-primary-foreground-muted text-xl font-bold text-shadow-md text-shadow-slate-900/10 lg:text-shadow-slate-800 lg:text-shadow-md md:text-5xl capitalize">
				{title}
			</div>
			<div className="text-sm text-[#8A97A5D4]/80 episode-p pr-[10%] mb-1">
				<div className="flex flex-wrap items-center gap-2 my-2">
					{durationMin ? (
						<Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 rounded-full px-2 h-6 text-[10px] font-bold">
							{durationMin} min
						</Badge>
					) : null}
					<Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-full px-2 h-6 text-[10px] font-bold">
						{created.toLocaleDateString()}
					</Badge>
					{metaBadges}
					{rightLink ? (
						<div className="text-[10px] font-bold break-words border-0 px-2 h-6 flex rounded-full gap-1.5 text-[#fff] bg-red-500 hover:bg-red-600 items-center transition-colors">
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
