import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Clock, CheckCircle2, Video, Calendar, Sparkles } from "lucide-react";
import Link from "next/link";

export async function AutoEpisodesStatusCard() {
	const { userId } = await auth();
	
	if (!userId) {
		return null;
	}

	// Check if user has Curate Control plan
	const subscription = await prisma.subscription.findFirst({
		where: { user_id: userId },
		orderBy: { updated_at: "desc" },
		select: {
			plan_type: true,
			status: true,
		},
	});

	const hasCurateControl = subscription?.plan_type === "curate_control";
	const isActive = ["active", "trialing"].includes(subscription?.status?.toLowerCase() || "");
	const hasAccess = hasCurateControl && isActive;

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

	// Count pending videos
	const pendingVideosCount = await prisma.youtubeFeedEntry.count({
		where: {
			user_id: userId,
			processed: false,
		},
	});

	// Count total auto-generated episodes
	const totalAutoEpisodes = await prisma.userEpisode.count({
		where: {
			user_id: userId,
			auto_generated: true,
		},
	});

	// Next scheduled run is 6:30 AM UTC daily
	const now = new Date();
	const nextRun = new Date();
	nextRun.setUTCHours(6, 30, 0, 0);
	if (nextRun <= now) {
		nextRun.setUTCDate(nextRun.getUTCDate() + 1);
	}

	const timeUntilNextRun = nextRun.getTime() - now.getTime();
	const hoursUntilNextRun = Math.floor(timeUntilNextRun / (1000 * 60 * 60));
	const minutesUntilNextRun = Math.floor((timeUntilNextRun % (1000 * 60 * 60)) / (1000 * 60));

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="flex items-center gap-2">
							<Sparkles className="h-5 w-5 text-purple-500" />
							Auto-Generated Episodes
						</CardTitle>
						<CardDescription>
							Automatically generated daily from your content preferences
						</CardDescription>
					</div>
					{hasAccess && config?.is_active ? (
						<Badge variant="default" className="bg-green-600">
							<CheckCircle2 className="h-3 w-3 mr-1" />
							Active
						</Badge>
					) : (
						<Badge variant="secondary">Inactive</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{!hasAccess ? (
					<div className="text-sm text-muted-foreground space-y-2">
						<p>
							Upgrade to <strong>Curate Control</strong> to automatically generate episodes daily from your favorite channels.
						</p>
						<Link
							href="/manage-membership"
							className="text-primary hover:underline inline-flex items-center gap-1"
						>
							View Plans →
						</Link>
					</div>
				) : !config?.is_active || !config?.rss_feed_url ? (
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
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Total Generated</p>
								<p className="text-2xl font-semibold">{totalAutoEpisodes}</p>
							</div>
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Videos in Queue</p>
								<p className="text-2xl font-semibold">{pendingVideosCount}</p>
							</div>
						</div>

						{/* Latest Episode */}
						{latestAutoEpisode ? (
							<div className="space-y-2 pt-2 border-t">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Video className="h-4 w-4" />
									<span>Latest Episode</span>
								</div>
								<Link
									href={`/my-episodes/${latestAutoEpisode.episode_id}`}
									className="block hover:bg-muted/50 p-3 rounded-lg transition-colors"
								>
									<p className="font-medium line-clamp-2 text-sm">
										{latestAutoEpisode.episode_title}
									</p>
									<div className="flex items-center gap-3 mt-2">
										<Badge variant={latestAutoEpisode.status === "COMPLETED" ? "default" : "secondary"}>
											{latestAutoEpisode.status}
										</Badge>
										<span className="text-xs text-muted-foreground">
											{new Date(latestAutoEpisode.created_at).toLocaleDateString()}
										</span>
									</div>
								</Link>
							</div>
						) : (
							<div className="text-sm text-muted-foreground pt-2 border-t">
								<p>No episodes generated yet. Your first episode will be created at the next scheduled run.</p>
							</div>
						)}

						{/* Next Scheduled Run */}
						<div className="space-y-2 pt-2 border-t">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Clock className="h-4 w-4" />
								<span>Next Generation</span>
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium">
										{nextRun.toLocaleDateString()} at {nextRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{hoursUntilNextRun > 0 && `${hoursUntilNextRun}h `}
										{minutesUntilNextRun}m from now
									</p>
								</div>
								{pendingVideosCount > 0 && (
									<Badge variant="outline">
										{pendingVideosCount} {pendingVideosCount === 1 ? "video" : "videos"} ready
									</Badge>
								)}
							</div>
						</div>

						{/* How It Works */}
						<div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
							<p className="font-medium">How it works:</p>
							<ul className="list-disc list-inside space-y-0.5 ml-2">
								<li>New videos are fetched daily at 6:00 AM UTC</li>
								<li>The latest video is auto-processed at 6:30 AM UTC</li>
								<li>Episodes appear in your library automatically</li>
							</ul>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

