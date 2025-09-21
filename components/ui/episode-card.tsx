"use client";

import Image from "next/image";
import type React from "react";
import { useYouTubeChannel } from "@/hooks/useYouTubeChannel";
import { Badge } from "./badge";
import { Card, CardAction, CardHeader, CardTitle } from "./card";
import DateIndicator from "./date-indicator";
import DurationIndicator from "./duration-indicator";

type EpisodeCardProps = {
	as?: "li" | "div";
	imageUrl?: string | null;
	title: string;
	description?: string | null;
	publishedAt?: Date | string | null;
	durationSeconds?: number | null;
	actions?: React.ReactNode;
	// YouTube channel props for user episodes
	youtubeUrl?: string | null;
	// Optional: link to details page for this episode
	detailsHref?: string | null;
};

export function EpisodeCard({ as = "div", imageUrl, title, publishedAt, durationSeconds, actions, youtubeUrl, detailsHref }: EpisodeCardProps) {
	// biome-ignore lint/suspicious/noExplicitAny: <temp>
	const _Root: any = as;
	const date: Date = publishedAt ? new Date(publishedAt) : new Date();

	// Get YouTube channel image for user episodes
	const { channelImage: youtubeChannelImage, isLoading: isChannelLoading } = useYouTubeChannel(youtubeUrl ?? null);

	return (
		<Card className="bg-card w-full px-2 py-5 relative mb-4">
			<CardAction>{actions}</CardAction>
			<div className="w-full flex flex-row gap-4">
				<CardHeader>
					{(() => {
						// For bundle episodes, use the episode's image_url
						if (imageUrl) {
							return <Image src={imageUrl} alt={title} className="h-14 w-14 md:h-22 md:w-22 border-2 m-2 max-w-22 shadow-md border-[#98CAD35C] rounded-xl object-cover" width={100} height={60} />;
						}
						// For user episodes, use YouTube channel image if available
						if (youtubeUrl) {
							if (youtubeChannelImage) {
								return (
									<Image
										src={youtubeChannelImage}
										alt={`${title} - YouTube Channel`}
										className="h-14 w-14 md:h-22 md:w-22 border-2 m-2 max-w-22 shadow-md border-[#98CAD35C] rounded-xl object-cover"
										width={100}
										height={60}
									/>
								);
							}
							// Show loading state for user episodes while fetching channel image
							if (isChannelLoading) {
								return (
									<div className="h-14 w-14 md:h-22 md:w-22 border-2 m-2 max-w-22 shadow-md border-[#98CAD35C] rounded-xl bg-gray-600 animate-pulse flex items-center justify-center">
										<div className="h-4 w-4 bg-gray-400 rounded animate-pulse" />
									</div>
								);
							}
						}
						return null;
					})()}
				</CardHeader>

				<div className="flex flex-col w-full">
					<CardTitle className="w-full">{title}</CardTitle>

					<div className="flex flex-row gap-2">
						<Badge variant="outline">
							<DateIndicator size="sm" indicator={date} label={null} />
						</Badge>
						<Badge variant="secondary">
							<DurationIndicator seconds={durationSeconds ?? null} />
						</Badge>
						{detailsHref ? (
							<a href={detailsHref} className="inline-flex items-center px-2 py-1 text-xs rounded-md border border-[#98CAD35C] hover:bg-[#ffffff0d] transition-colors">
								View
							</a>
						) : null}
					</div>
				</div>
			</div>
		</Card>
	);
}

export default EpisodeCard;
