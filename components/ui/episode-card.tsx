"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useYouTubeChannel } from "@/hooks/useYouTubeChannel";
import { Badge } from "./badge";
import { Card, CardAction } from "./card";
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
	// Whether this is a news episode
	isNewsEpisode?: boolean;
};

export function EpisodeCard({ imageUrl, title, publishedAt, durationSeconds, actions, youtubeUrl, detailsHref, isNewsEpisode }: EpisodeCardProps) {
	const date: Date = publishedAt ? new Date(publishedAt) : new Date();

	// Get YouTube channel image for user episodes
	const { channelImage: youtubeChannelImage, isLoading: isChannelLoading } = useYouTubeChannel(youtubeUrl ?? null);

	return (
		<Card variant="default" className="bg-card relative w-full h-[230px] sm:h-[150px] md:h-[200px] lg:h-[130px]  gap-2">
			<CardAction>{actions}</CardAction>
			<div className="w-full h-full flex flex-col-reverse sm:flex-row justify-evenly px-0  md:flex-col-reverse lg:flex-row gap-2 sm:gap-5 lg:gap-3 items-start  lg:items-start py-4 lg:py-1 lg:px-0 content-center relative ">
				{(() => {
					// For bundle episodes, use the episode's image_url
					if (imageUrl) {
						return (
							<div className="aspect-video w-full h-fit max-h-[90px] max-w-[150px]   xl:h-42 md:h-32 sm:max-h-[90px] sm:max-w-[140px] lg:h-auto lg:max-h-[90px] lg:hidden xl:flex shadow-[1px_2px_5px_2px_#003e3cca,1px_-7px_19px_0px_#013e3cca_inset] bg-[#25026692] shadow-black/35 border-[#292e3eed] rounded-md md:rounded-lg overflow-hidden border-4	 outline-2 outline-[#0ca4fc9e]   lg:min-w-[18%]">
								<Image src={imageUrl} alt={title} className="h-full w-full inline-flex content-center object-cover mix-blend-screen  shadow-zinc-800  opacity-80 " width={200} height={80} />
							</div>
						);
					}
					// For news episodes, use the generic news placeholder
					if (isNewsEpisode) {
						return (
							<div className="aspect-video w-full h-fit max-h-[140px] max-w-[200px]   xl:h-42 md:h-32 sm:max-h-[90px] sm:max-w-[140px] lg:h-auto lg:max-h-[90px] lg:hidden xl:flex shadow-[1px_2px_5px_2px_#003e3cca,1px_-7px_19px_0px_#013e3cca_inset] bg-[#25026692] shadow-black/35 border-[#292e3eed] rounded-md md:rounded-lg overflow-hidden border-4	 outline-2 outline-[#0ca4fc9e]   lg:min-w-[18%]">
								<Image
									src="/generic-news-placeholder.png"
									alt={title}
									className="h-full w-full inline-flex content-center object-fit   shadow-zinc-800  opacity-80 "
									width={200}
									height={80}
								/>
							</div>
						);
					}
					// For user episodes, use YouTube channel image if available
					if (youtubeUrl) {
						if (youtubeChannelImage) {
							return (
								<div className="aspect-video w-full h-fit max-h-[140px] max-w-[200px]   xl:h-42 md:h-32 sm:max-h-[90px] sm:max-w-[140px] lg:h-auto lg:max-h-[90px] lg:hidden xl:flex shadow-[1px_2px_5px_2px_#003e3cca,1px_-7px_19px_0px_#013e3cca_inset] bg-[#25026692] shadow-black/35 border-[#292e3eed] rounded-md md:rounded-lg overflow-hidden border-4	 outline-2 outline-[#0ca4fc9e]   lg:min-w-[18%]">
									<Image
										src={youtubeChannelImage}
										alt={title}
										className="h-full w-full inline-flex content-center object-cover   shadow-zinc-800  opacity-80 "
										width={300}
										height={200}
									/>
								</div>
							);
						}
						// Show loading state for user episodes while fetching channel image
						if (isChannelLoading) {
							return (
								<div className="h-12 w-12 md:h-16 md:w-18 border-2 m-2 max-w-18 shadow-md border-[#0c0e0fd0] rounded-xl bg-secondary animate-pulse flex items-center justify-center">
									<div className="h-4 w-4rounded animate-pulse" />
								</div>
							);
						}
					}
					return null;
				})()}

				<div className="flex w-[97%] flex-col justify-between h-fit items-start content-start py-0 md:px-3 md:flex-col  md:pl-0  md:gap-0 md:justify-between md:min-h-fit lg:pl-2 lg:pt-2">
					{detailsHref ? (
						<Link
							className="text-[0.9rem] font-semibold md:w-full md:text-[0.65]  leading-tight line-clamp-2 h-auto max-h-14 lg:max-w-[85%] lg:text-base mb-5 lg:pb-0 text-primary-foreground text-shadow-2xs hover:text-cyan-200 hover:decoration-teal-800 hover:opacity-90 transition-all duration-300 text-left capitalize"
							href={detailsHref}>
							{title}
						</Link>
					) : null}

					<div className="flex gap-1 h-fit">
						<Badge variant="outline" className="min-w-[70px]">
							<DateIndicator size="sm" indicator={date} label={null} />
						</Badge>
						<Badge variant="secondary" className="max-w-[80px] px-2">
							<DurationIndicator seconds={durationSeconds ?? null} />
						</Badge>
					</div>
				</div>
			</div>
		</Card>
	);
}

export default EpisodeCard;
