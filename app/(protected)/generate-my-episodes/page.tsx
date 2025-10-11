import type { Metadata } from "next"
import { EpisodeCreator } from "../my-episodes/_components/episode-creator"
import { UsageDisplay } from "../my-episodes/_components/usage-display"

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
	return { title: "Generate My Episodes", description: "Create new episodes from YouTube links." }
}

export default async function GenerateMyEpisodesPage() {
	return (
		<div className=" h-full mdLmin-h-[84vh] overflow-hidden md:episode-card-wrapper lg:bg-bigcard  flex-col-reverse px-0 mx-0 md:mx-3 flex lg:flex-row-reverse rounded-sm lg:rounded-3xl border-1 border-[#69a8cf32] shadow-lg md:mt-4 md:w-full">

			<UsageDisplay />
			<EpisodeCreator />
		</div>
	)
}


