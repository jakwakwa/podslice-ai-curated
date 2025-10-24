"use client";

import { PageHeader } from "@/components/ui/page-header";
import { EpisodesClient } from "./_components/episodes-client";
import { episodesPageContent } from "./content";

export default function EpisodesPage() {
  return (
    <div className="my-blur animated-background h-full min-h-[84vh] rounded-none px-0 mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl md:mt-0 md:p-8 md:w-full md:bg-episode-card-wrapper md:bg-bigcard">
      <div className="min-w-full w-screen md:w-full md:bg-bigcard">
        <PageHeader
          title={episodesPageContent.header.title}
          description={episodesPageContent.header.description}
        />

        <EpisodesClient initialEpisodes={[]} initialBundleType="all" />
      </div>
    </div>
  );
}
