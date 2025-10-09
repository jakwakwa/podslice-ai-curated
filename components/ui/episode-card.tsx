"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useYouTubeChannel } from "@/hooks/useYouTubeChannel";
import { Badge } from "./badge";
import { Button } from "./button";
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
};

export function EpisodeCard({ as = "div", imageUrl, title, publishedAt, durationSeconds, actions, youtubeUrl, detailsHref }: EpisodeCardProps) {
	// biome-ignore lint/suspicious/noExplicitAny: <temp>
	const _Root: any = as;
	const date: Date = publishedAt ? new Date(publishedAt) : new Date();

	// Get YouTube channel image for user episodes
	const { channelImage: youtubeChannelImage, isLoading: isChannelLoading } = useYouTubeChannel(youtubeUrl ?? null);

	return (
		<Card className="bg-card w-full h-[230px] md:h-[250px]  lg:h-34 px-4">
			<CardAction>{actions}</CardAction>
			<div className="w-full h-full flex flex-col justify-between   lg:flex-row gap-2 lg:gap-3 items-start lg:items-start py-4 lg:py-2 lg:px-0 content-center relative">
				{(() => {
					// For bundle episodes, use the episode's image_url
					if (imageUrl) {
						return (
							<div className="aspect-video h-16 md:h-16 lg:h-12 shadow-[1px_2px_5px_2px_#003e3cca,1px_-7px_19px_0px_#013e3cca_inset] bg-[#25026692] shadow-black/35 border-[#1f2e54ed] rounded-md md:rounded-lg overflow-hidden border-4	 outline-2 outline-[#0911199e]   lg:min-w-[20%]">
								<Image src={imageUrl} alt={title} className="h-full w-full inline-flex content-center object-cover mix-blend-exclusion  shadow-zinc-800  opacity-80 " width={200} height={80} />
							</div>
						);
					}
					// For user episodes, use YouTube channel image if available
					if (youtubeUrl) {
						if (youtubeChannelImage) {
							return (
								<div className="aspect-video h-16 md:h-17 lg:h-17 shadow-[1px_2px_5px_2px_#003e3cca,1px_-7px_19px_0px_#013e3cca_inset] bg-[#25026692] shadow-black/35 border-[#1f2e54ed] rounded-md md:rounded-lg overflow-hidden border-4	 outline-2 outline-[#0911199e] relative">
									<Image
										src={youtubeChannelImage}
										alt={title}
										className="h-42 w-100 inline-flex justify-center content-center object-cover mix-blend-screen absolute my-auto shadow-zinc-600 bottom-0 top-2 opacity-60 "
										width={300}
										height={100}
									/>
								</div>
							);
						}
						// Show loading state for user episodes while fetching channel image
						if (isChannelLoading) {
							return (
								<div className="h-12 w-12 md:h-16 md:w-18 border-2 m-2 max-w-18 shadow-md border-[#0c0e0fd0] rounded-xl bg-gray-600 animate-pulse flex items-center justify-center">
									<div className="h-4 w-4 bg-gray-400 rounded animate-pulse" />
								</div>
							);
						}
					}
					return null;
				})()}

				<div className="flex w-full flex-col justify-start items-start content-start py-0 px-4 md:flex-col md:gap-0 md:justify-start">
					<div className="text-[0.8rem] w-[97%] font-bold md:w-[69%] md:text-[0.65] sm:mb-4  md:mb-0 md:mt-0 leading-normal line-clamp-2 text-shadow-sm lg:text-[1rem] lg:mb-0  text-[#7e9ec4] text-left">
						{title}
					</div>
					<div className="w-full flex justify-start flex-col items-start gap-9 md:flex-col md:justify-start md:items-start">

						<div className="w-full  flex flex-row justify-between gap-2 items-end mt-2 md:flex-row md:items-start">
							{detailsHref ? (
								<Button variant="outline" className="bg-slate-800/65 rounded-full px-4 py-0" size="xs">
									<Link className="text-[0.75rem] font-medium py-1.5  text-[#93bcb8]" href={detailsHref}>
										Full Summary
									</Link>
								</Button>
							) : null}
							<div className="flex gap-1 h-5">
								<Badge variant="outline" className="min-w-[70px]">
									<DateIndicator size="sm" indicator={date} label={null} />
								</Badge>
								<Badge variant="secondary" className="max-w-[80px] px-2">
									<DurationIndicator seconds={durationSeconds ?? null} />
								</Badge>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
}

export default EpisodeCard;
