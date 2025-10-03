import type { Metadata } from "next"
import { EpisodeCreator } from "../my-episodes/_components/episode-creator"
import { UsageDisplay } from "../my-episodes/_components/usage-display"

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
	return { title: "Generate My Episodes", description: "Create new episodes from YouTube links." }
}

export default async function GenerateMyEpisodesPage() {
	return (
		<div className=" h-full min-h-[84vh] overflow-hidden bg-generate-episode-card-wrapper  px-0 mx-0 md:mx-3 flex flex-col lg:flex-row-reverse rounded-sm lg:rounded-3xl border-2 border-[#c8d3da32] shadow-lg md:mt-4 md:w-full">

			<UsageDisplay />
			<EpisodeCreator />
		</div>
	)
}


