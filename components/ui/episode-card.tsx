"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useYouTubeChannel } from "@/hooks/useYouTubeChannel";
import { Badge } from "./badge";
import { Button } from "./button";
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
		<Card className="bg-card w-full h-[230px] md:h-[250px]  lg:h-34">
			<CardAction>{actions}</CardAction>
			<div className="w-full h-full flex flex-col md:flex-col     lg:flex-row gap-2 lg:gap-3 items-start lg:items-center justify-evenly py-4 lg:py-2 lg:px-0 content-center relative">
				<CardHeader>
					{(() => {
						// For bundle episodes, use the episode's image_url
						if (imageUrl) {
							return (
								<div className="aspect-video h-18 md:h-18 lg:h-17 shadow-[1px_2px_5px_2px_#003e3cca,1px_-7px_19px_0px_#013e3cca_inset] bg-[#25026692] shadow-black/35 border-[#1f2e54ed] rounded-md md:rounded-lg overflow-hidden border-4	 outline-2 outline-[#0911199e]">
									<Image src={imageUrl} alt={title} className="h-full w-full inline-flex content-center object-cover mix-blend-exclusion  shadow-zinc-800  opacity-80 " width={200} height={80} />
								</div>
							);
						}
						// For user episodes, use YouTube channel image if available
						if (youtubeUrl) {
							if (youtubeChannelImage) {
								return (
									<div className="aspect-video h-18 md:h-18 lg:h-17 shadow-[1px_2px_5px_2px_#003e3cca,1px_-7px_19px_0px_#013e3cca_inset] bg-[#25026692] shadow-black/35 border-[#1f2e54ed] rounded-md md:rounded-lg overflow-hidden border-4	 outline-2 outline-[#0911199e] relative">
										<Image src={youtubeChannelImage} alt={title} className="h-42 w-100 inline-flex justify-center content-center object-cover mix-blend-screen absolute my-auto shadow-zinc-600 bottom-0 top-2 opacity-60 " width={300} height={100} />
									</div>
								);
							}
							// Show loading state for user episodes while fetching channel image
							if (isChannelLoading) {
								return (
									<div className="h-12 w-12 md:h-18 md:w-18 border-2 m-2 max-w-18 shadow-md border-[#0c0e0fd0] rounded-xl bg-gray-600 animate-pulse flex items-center justify-center">
										<div className="h-4 w-4 bg-gray-400 rounded animate-pulse" />
									</div>
								);
							}
						}
						return null;
					})()}
				</CardHeader>

				<div className="flex w-full flex-col justify-center items-start content-start py-0">
					<div className="text-[0.9rem] w-[98%] font-bold md:w-[90%] md:text-[0.85] md:font-bold sm:mb-4 md:mb-1 mt-0 leading-normal line-clamp-2 text-shadow-sm lg:text-[0.85rem] text-[#9fc1dd]">{title}</div>

					<div className="w-full flex justify-between flex-row items-center gap-2">
						<div className="flex flex-row-reverse justify-between w-full gap-2 items-end mt-2">
							{detailsHref ? (
								<Button variant="outline" className="bg-slate-800/65 rounded-lg px-4 py-1" size="xs">
									<Link className="text-[0.75rem] font-medium"
										href={detailsHref}>

										Summary Details
									</Link>
								</Button>
							) : null}
							<div className="flex gap-1">
								<Badge variant="outline" className="max-w-[80px] px-2">
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
