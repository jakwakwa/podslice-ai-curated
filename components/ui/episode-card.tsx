"use client";

import Image from "next/image";
import type React from "react";
import { useYouTubeChannel } from "@/hooks/useYouTubeChannel";
import { Badge } from "./badge";
import { Card, CardAction, CardHeader } from "./card";
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
		<Card className="bg-card w-full px-2 py-5 relative">
			<CardAction>{actions}</CardAction>
			<div className="w-full flex flex-col md:flex-row gap-2 items-start md:items-center">
				<CardHeader>
					{(() => {
						// For bundle episodes, use the episode's image_url
						if (imageUrl) {
							return <Image src={imageUrl} alt={title} className="h-12 w-12 md:h-18 md:w-18 border-2 m-2 max-w-18 shadow-md border-[#98CAD35C] rounded-xl object-cover" width={100} height={60} />;
						}
						// For user episodes, use YouTube channel image if available
						if (youtubeUrl) {
							if (youtubeChannelImage) {
								return (
									<Image
										src={youtubeChannelImage}
										alt={`${title} - YouTube Channel`}
										className="h-12 w-12 md:h-18 md:w-18 border-2 m-2 max-w-18 shadow-md border-[#98CAD35C] rounded-xl object-cover"
										width={100}
										height={60}
									/>
								);
							}
							// Show loading state for user episodes while fetching channel image
							if (isChannelLoading) {
								return (
									<div className="h-12 w-12 md:h-18 md:w-18 border-2 m-2 max-w-18 shadow-md border-[#98CAD35C] rounded-xl bg-gray-600 animate-pulse flex items-center justify-center">
										<div className="h-4 w-4 bg-gray-400 rounded animate-pulse" />
									</div>
								);
							}
						}
						return null;
					})()}
				</CardHeader>

				<div className="flex flex-col justify-start items-start content-start ">
					<div className=" md:w-[80%] font-semibold mb-2 line-clamp-2 truncate text-[0.9rem] text-[#9fd5dd]">{title}</div>

					<div className="w-full flex justify-between flex-row items-center gap-2">
						<div className="flex gap-2">
							<Badge variant="outline" className="max-w-[80px] px-2">
								<DateIndicator size="sm" indicator={date} label={null} />
							</Badge>
							<Badge variant="secondary" className="max-w-[80px] px-2">
								<DurationIndicator seconds={durationSeconds ?? null} />
							</Badge>
						</div>

						{detailsHref ? (
							<a
								href={detailsHref}
								className="absolute right-6 bottom-4 md:right-6 md:bottom-6 md:flex items-center px-2 py-0.5 text-[0.6rem] rounded-md border border-[#25b9c74a] hover:bg-[#ffffff0d]  bg-[#16141449] transition-colors text-[#18b3bb] ">
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
