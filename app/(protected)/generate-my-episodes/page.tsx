import type { Metadata } from "next";
import CommonSectionWithChildren from "@/components/shared/section-common";
import { EpisodeCreator } from "../my-episodes/_components/episode-creator";
import { UsageDisplay } from "../my-episodes/_components/usage-display";
import { PageHeader } from "@/components/ui/page-header";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "Create Your Summary",
		description: "Create new episodes from YouTube links.",
	};
}

export default async function GenerateMyEpisodesPage() {
	const content = {
		title: "Create Your Summary",
		description:
			"This is where the real power lies. Found a 2-hour interview or lecture on YouTube? Just paste the link into Podslice. Want to catch up on the latest news? Select your desired sources and topics. Our AI will get to work and create a custom summary (both audio and text) just for you.",
	} as const;

	return (
		<div className="h-full rounded-none px-0 mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl md:mt-0 md:p-8 md:w-full md:gap-y-4">
			<PageHeader
				title={content.title}
				description={content.description}
			/>
			<CommonSectionWithChildren title={content.title} description={content.description}>

				<div className="flex flex-col-reverse lg:flex-row-reverse gap-4 md:gap-6 px-0 mx-0 md:mx-0 md:mb-0">
					<UsageDisplay />
					<EpisodeCreator />
				</div>
			</CommonSectionWithChildren>
		</div>
	);
}
