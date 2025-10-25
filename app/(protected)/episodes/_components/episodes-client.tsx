"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import { EpisodeList } from "@/components/episode-list";
import { EpisodesPageSkeleton } from "@/components/shared/skeletons/episodes-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Episode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";
import { ONE_HOUR } from "@/lib/swr";
import { EpisodesFilterBar } from "./episodes-filter-bar";
import { episodesPageContent } from "../content";

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
      <div className="md:max-w-2xl md:mx-auto mt-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{episodesPageContent.states.error.title}</AlertTitle>
          <AlertDescription className="mt-2">{error.message}</AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Button onClick={() => mutate()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
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
  const sectionContent = getSectionContent();

  return (
    <div className="border-1 border-border rounded-none overflow-hidden mb-0 p-0 mt-0 md:mt-4 md:m-0 md:p-0 outline-0 md:rounded-4xl md:shadow-xl">
      <div className="text-left md:pt-8 rounded-none my-0 py-0 md:mb-5 md:pb-7 overflow-hidden md:rounded-4xl md:py-0 min-w-full min-h-full bg-episode-card-wrapper">
        {/* Header and Filter in Responsive Flex Container */}
        <div className="flex flex-col md:flex-row justify-between items-start w-full gap-2 px-6 xl:px-12 py-8 md:pt-8">
          {/* Section Header Content */}
          <div className="flex-1">
            <h2 className="text-2xl leading-9 font-semibold tracking-tight mb-4 text-primary-foreground">
              {sectionContent.title}
            </h2>
            <p className="leading-5 font-normal text-secondary-foreground tracking-wide max-w-[600px]">
              {sectionContent.description}
            </p>
          </div>

          {/* Filter Dropdown */}
          <div className="w-full md:w-auto md:min-w-[280px]">
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
        <div className="flex md:rounded-3xl md:bg-bigcard px-2 md:px-12 md:py-12 flex-col justify-start items-start w-full gap-0 ">
          <EpisodeList episodes={episodes} onPlayEpisode={handlePlayEpisode} />
        </div>
      </div>
    </div>
  );
}
