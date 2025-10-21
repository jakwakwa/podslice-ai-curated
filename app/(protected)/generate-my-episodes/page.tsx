import type { Metadata } from "next"
import { EpisodeCreator } from "../my-episodes/_components/episode-creator"
import { UsageDisplay } from "../my-episodes/_components/usage-display"

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
	return { title: "Generate My Episodes", description: "Create new episodes from YouTube links." }
}

export default async function GenerateMyEpisodesPage() {
	return (
		<div className="h-full min-h-[84vh]  rounded-none 	px-0  mx-0 md:mx-0 flex flex-col lg:rounded-3xl md:rounded-4xl  md:mt-0 md:p-0 md:w-full  md:bg-episode-card-wrapper ">
			<div className=" h-full mdLmin-h-[84vh] overflow-hidden md:episode-card-wrapper lg:bg-bigcard  flex-col-reverse px-0 mx-0 md:mx-3 flex lg:flex-row-reverse rounded-sm lg:rounded-3xl border-1 border-[#69a8cf32] shadow-lg md:mt-0 md:w-full gap-4 md:gap-0">

				<UsageDisplay />
				<EpisodeCreator />
			</div>
		</div>
	)
}


