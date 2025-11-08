import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Clock, CheckCircle2, Video, Sparkles } from "lucide-react";
import Link from "next/link";

export async function AutoEpisodesStatusCard() {
	const { userId } = await auth();
	
	if (!userId) {
		return null;
	}

	// Get user's ingestion config
	const config = await prisma.userIngestionConfig.findFirst({
		where: { user_id: userId },
		select: {
			is_active: true,
			rss_feed_url: true,
		},
	});

	// Get latest auto-generated episode
	const latestAutoEpisode = await prisma.userEpisode.findFirst({
		where: {
			user_id: userId,
			auto_generated: true,
		},
		orderBy: { created_at: "desc" },
		select: {
			episode_id: true,
			episode_title: true,
			created_at: true,
			status: true,
		},
	});

	// Count total auto-generated episodes
	const totalAutoEpisodes = await prisma.userEpisode.count({
		where: {
			user_id: userId,
			auto_generated: true,
		},
	});

	// Next scheduled run is 12:30 AM UTC daily (midnight)
	const now = new Date();
	const nextRun = new Date();
	nextRun.setUTCHours(0, 30, 0, 0);
	if (nextRun <= now) {
		nextRun.setUTCDate(nextRun.getUTCDate() + 1);
	}

	const timeUntilNextRun = nextRun.getTime() - now.getTime();
	const hoursUntilNextRun = Math.floor(timeUntilNextRun / (1000 * 60 * 60));
	const minutesUntilNextRun = Math.floor((timeUntilNextRun % (1000 * 60 * 60)) / (1000 * 60));

	return (
		<div className="bg-bigcard w-full flex flex-col gap-0 justify-start mb-0 items-start shadow-xl shadow-indigo/30 mt-0 md:m-0 xl:flex-col md:gap-4 py-8 p-1 md:mt-4 md:mb-0 border-1 md:rounded-3xl lg:pb-8 lg:pt-0 overflow-hidden md:p-0 md:justify-start align-start lg:mb-8">
			<div className="pt-0 px-5 md:pl-8 md:mt-8 w-full flex flex-col items-start justify-items-start">
				<div className="flex items-start justify-between w-full mb-4">
					<div className="space-y-2 flex-1">
						<div className="flex items-center gap-2">
							<Sparkles className="h-5 w-5 text-purple-500" />
							<h3 className="text-base font-bold text-secondary-foreground">
								Auto-Generated Episodes
							</h3>
						</div>
						<p className="text-sm text-primary-foreground/80 opacity-90">
							Automatically generated daily from your content preferences
						</p>
					</div>
					{config?.is_active && config?.rss_feed_url ? (
						<Badge variant="default" className="bg-[#1ca896] shadow-md shadow-[#53998e91] text-[#fff]/80">
							<CheckCircle2 className="h-3 w-3 mr-1" />
							Active
						</Badge>
					) : (
						<Badge variant="secondary">Inactive</Badge>
					)}
				</div>
			</div>
			<div className="px-5 md:px-8 w-full space-y-4 pb-6">
				{!config?.is_active || !config?.rss_feed_url ? (
					<div className="text-sm text-muted-foreground space-y-2">
						<p>
							Set up your content preferences to start receiving auto-generated episodes.
						</p>
						<Link
							href="/content-preferences"
							className="text-primary hover:underline inline-flex items-center gap-1"
						>
							Configure Now →
						</Link>
					</div>
				) : (
					<>
						{/* Stats Grid */}
						<div className="bg-sidebar/50 p-4 rounded-lg border border-border/50">
							<div className="space-y-1">
								<p className="text-xs text-primary-foreground/60 uppercase tracking-wide font-mono font-bold">Total Auto-Generated</p>
								<p className="text-2xl font-semibold text-secondary-foreground">{totalAutoEpisodes}</p>
							</div>
						</div>

						{/* Latest Episode */}
						{latestAutoEpisode ? (
							<div className="space-y-2 pt-2 border-t border-border/50">
								<div className="flex items-center gap-2 text-sm text-primary-foreground/60">
									<Video className="h-4 w-4" />
									<span className="uppercase tracking-wide font-mono font-bold text-xs">Latest Episode</span>
								</div>
								<Link
									href={`/my-episodes/${latestAutoEpisode.episode_id}`}
									className="block hover:bg-sidebar/50 p-3 rounded-lg transition-colors border border-border/30"
								>
									<p className="font-medium line-clamp-2 text-sm text-secondary-foreground">
										{latestAutoEpisode.episode_title}
									</p>
									<div className="flex items-center gap-3 mt-2">
										<Badge variant={latestAutoEpisode.status === "COMPLETED" ? "default" : "secondary"} className={latestAutoEpisode.status === "COMPLETED" ? "bg-[#1ca896] text-[#fff]/80" : ""}>
											{latestAutoEpisode.status}
										</Badge>
										<span className="text-xs text-muted-foreground">
											{new Date(latestAutoEpisode.created_at).toLocaleDateString()}
										</span>
									</div>
								</Link>
							</div>
						) : (
							<div className="text-sm text-muted-foreground pt-2 border-t border-border/50">
								<p>No episodes generated yet. Your first episode will be created at the next scheduled run.</p>
							</div>
						)}

						{/* Next Scheduled Run */}
						<div className="space-y-2 pt-2 border-t border-border/50">
							<div className="flex items-center gap-2 text-sm text-primary-foreground/60">
								<Clock className="h-4 w-4" />
								<span className="uppercase tracking-wide font-mono font-bold text-xs">Next Generation</span>
							</div>
							<div className="bg-sidebar/50 p-3 rounded-lg border border-border/30">
								<p className="text-sm font-medium text-secondary-foreground">
									{nextRun.toLocaleDateString()} at {nextRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
								</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									{hoursUntilNextRun > 0 && `${hoursUntilNextRun}h `}
									{minutesUntilNextRun}m from now
								</p>
							</div>
						</div>

						{/* How It Works */}
						<div className="text-xs text-muted-foreground pt-2 border-t border-border/50 space-y-2 bg-sidebar/30 p-3 rounded-lg">
							<p className="font-bold text-primary-foreground/60 uppercase tracking-wide font-mono text-[0.65rem]">How it works:</p>
							<ul className="list-disc list-inside space-y-1 ml-2 text-xs">
								<li>New videos are fetched daily at midnight UTC</li>
								<li>The latest video is auto-processed at 12:30 AM UTC</li>
								<li>Episodes appear in your library automatically</li>
							</ul>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

