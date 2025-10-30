"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { EpisodeList } from "@/components/episode-list";
import SectionHeader from "@/components/shared/section-header";
import { EpisodesPageSkeleton } from "@/components/shared/skeletons/episodes-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ONE_HOUR } from "@/lib/swr";
import type { Episode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";
import { episodesPageContent } from "../content";
import { EpisodesFilterBar } from "./episodes-filter-bar";

type BundleType = "all" | "curated" | "shared";

interface EpisodesClientProps {
	initialEpisodes: Episode[];
	initialBundleType?: BundleType;
}

export function EpisodesClient({
	initialEpisodes,
	initialBundleType = "all",
}: EpisodesClientProps) {
	const [bundleType, setBundleType] = useState<BundleType>(initialBundleType);
	const { setEpisode } = useAudioPlayerStore();

	const key = useMemo(() => `/api/episodes?bundleType=${bundleType}`, [bundleType]);
	const { data, error, isLoading, mutate } = useSWR<Episode[]>(key, {
		// Episodes can change, but not frequently; allow 1 hour stale
		dedupingInterval: ONE_HOUR,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const episodes = data ?? initialEpisodes;

	const handleBundleTypeChange = (value: BundleType) => {
		setBundleType(value);
	};

	const handlePlayEpisode = (episode: Episode) => {
		console.log("Episodes - Setting episode:", episode);
		setEpisode(episode);
	};

	// Get section content (title and description) based on bundle type
	const getSectionContent = () => {
		const { sections } = episodesPageContent;
		switch (bundleType) {
			case "all":
				return sections.all;
			case "curated":
				return sections.curated;
			case "shared":
				return sections.shared;
			default:
				return sections.all;
		}
	};

	// Loading state
	if (isLoading) {
		return <EpisodesPageSkeleton />;
	}

	// Error state
	if (error) {
		return (
			<div className="md:max-w-2xl md:mx-0 mt-8">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{episodesPageContent.states.error.title}</AlertTitle>
					<AlertDescription className="mt-2">{error.message}</AlertDescription>
				</Alert>
				<div className="my-6 text-center">
					<Button onClick={() => mutate()} variant="outline">
						<RefreshCw className="h-4 w-4 mr-0" />
						{episodesPageContent.states.error.button}
					</Button>
				</div>
			</div>
		);
	}

	// Empty state
	if (episodes.length === 0) {
		return (
			<div className="w-full max-w-[1000px] md:mx-auto mt-0">
				<Alert>
					<AlertTitle>{episodesPageContent.states.empty.title}</AlertTitle>
					<AlertDescription className="mt-2">
						{episodesPageContent.states.empty.description}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	// Main content
	const _sectionContent = getSectionContent();

	return (
		<div className="border-1 bg-[oklch(0.68_0.17_240/_0.06)] border-[rgba(227,114,244,0.14)] rounded-none overflow-hidden mb-0 p-0 mt-0 md:mt-0 md:m-0 md:px-1 outline-0 md:rounded-4xl md:shadow-xl bg-episode-card-wrapper  lg:mt-6">
			<div className="text-left md:pt-0 rounded-none my-0 py-0 md:mb-0 md:pb-0 overflow-hidden md:rounded-4xl md:py-0 min-w-full min-h-full flex justify-between items-center mx-0 lg:w-full lg:px-6	lg:pb-0	">
				<SectionHeader
					title="Generate your summary. This is where the real power lies"
					description="Love the long form podcast, but can't find time for it? Just paste the link of podcast show. Want to catch up on the latest news? Select your desired sources and topics and have the news analyst ai get the best updates for you"
				/>

				{/* Filter Dropdown */}
				<div className="w-full md:w-auto md:min-w-[180px]">
					<EpisodesFilterBar
						value={bundleType}
						onValueChange={handleBundleTypeChange}
						label={episodesPageContent.filters.label}
						placeholder={episodesPageContent.filters.selectPlaceholder}
						options={episodesPageContent.filters.options}
					/>
				</div>
			</div>

			{/* Episode List */}
			<div className="flex md:rounded-3xl md:px-2 mt-6 md:mt-0 lg:mt-8 flex-col justify-start items-start w-full gap-0 ">
				<EpisodeList episodes={episodes} onPlayEpisode={handlePlayEpisode} />
			</div>
		</div>

	);
}
