import type { Metadata } from "next"
import { EpisodeCreator } from "../my-episodes/_components/episode-creator"
import { UsageDisplay } from "../my-episodes/_components/usage-display"

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
	return { title: "Generate My Episodes", description: "Create new episodes from YouTube links." }
}

export default async function GenerateMyEpisodesPage() {
	return (
		<div className="w-full h-full min-h-[84vh]  generate-episode-card-wrapper p-0 flex flex-col lg:flex-row-reverse rounded-xl sm:rounded-xl md:rounded-3xl border-2 border-[#c8d3da32] shadow-lg overflow-x-hidden px-0 mx-0 mt-8 md:w-full md:mt-0">

			<UsageDisplay />
			<EpisodeCreator />
		</div>
	)
}


