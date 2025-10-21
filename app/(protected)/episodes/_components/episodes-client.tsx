"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EpisodeList } from "@/components/episode-list";
import { EpisodesPageSkeleton } from "@/components/shared/skeletons/episodes-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Episode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";
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
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundleType, setBundleType] = useState<BundleType>(initialBundleType);
  const { setEpisode } = useAudioPlayerStore();

  const fetchEpisodes = useCallback(async (type: BundleType) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/episodes?bundleType=${type}&ts=${Date.now()}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load episodes. Server responded with status ${response.status}.`,
        );
      }

      const episodesData = await response.json();
      setEpisodes(episodesData);
    } catch (error) {
      console.error("Error fetching episodes:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading episodes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEpisodes(bundleType);
  }, [bundleType, fetchEpisodes]);

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
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Button onClick={() => fetchEpisodes(bundleType)} variant="outline">
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
      <div className="text-left md:pt-8 rounded-none my-0 py-0 md:mb-5 md:pb-7 overflow-hidden md:rounded-4xl md:py-0 min-w-full min-h-full bg-primary/70">
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
