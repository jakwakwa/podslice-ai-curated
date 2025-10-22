"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Body, H2 } from "@/components/ui/typography";
import { PRICING_TIER } from "@/config/paddle-config";
import { useUserEpisodesStore } from "@/lib/stores/user-episodes-store";

export function UsageDisplay() {
  // const [usage, setUsage] = useState({ count: 0, limit: EPISODE_LIMIT })
  const [isLoading, setIsLoading] = useState(true);
  // const subscription = useSubscriptionStore(state => state.subscription)

  // ALWAYS CURATE_CONTROL PLAN
  const episodeLimit =
    PRICING_TIER.find((tier) => tier.planId === "CURATE_CONTROL")
      ?.episodeLimit || 20;

  const fetchCompletedEpisodeCount = useUserEpisodesStore(
    (state) => state.fetchCompletedEpisodeCount,
  );
  const completedEpisodeCount = useUserEpisodesStore(
    (state) => state.completedEpisodeCount,
  );
  const usage = { count: completedEpisodeCount, limit: episodeLimit };

  useEffect(() => {
    fetchCompletedEpisodeCount();
  }, [fetchCompletedEpisodeCount]);

  useEffect(() => {
    setIsLoading(false); // set loading to false when user episodes are fetched
  }, []);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="bg-[var(--gray-a4)] w-full px-6  mx-0  pt-6 lg:pt-12  pb-4 outline-0 border-l-0 rounded-none lg:border-b- lg:border-l lg:border-l-border lg:border-b-none sm:px-5 md:p-8 lg:w-[300px]">
      <div className="w-full flex flex-col gap-3">
        <H2 className=" text-sm md:text-lg  text-secondary-foreground">
          Monthly Usage
        </H2>

        <p className="font-normal text-xs md:text-md">
          You have generated <br /> <strong>{usage.count}</strong> of your{" "}
          <strong>{usage.limit}</strong> monthly episodes
        </p>
        <p className="text-destructive-foreground font-normal text-xs">
          {usage.count === usage.limit ? (
            <div>
              <span className="mr-3 text-sm">⚠️</span>Limit reached for the
              month{" "}
            </div>
          ) : (
            ""
          )}
        </p>
      </div>
    </div>
  );
}
