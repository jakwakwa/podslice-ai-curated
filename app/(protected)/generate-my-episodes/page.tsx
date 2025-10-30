import type { Metadata } from "next";
import CommonSectionWithChildren from "@/components/shared/section-common";
import { PageHeader } from "@/components/ui/page-header";
import { EpisodeCreator } from "../my-episodes/_components/episode-creator";
import { UsageDisplay } from "../my-episodes/_components/usage-display";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "Create Custom Ai Summary",
		description: "Easily Create pesonalised custom summaries with our Ai engine.",
	};
}

export default async function GenerateMyEpisodesPage() {
	const content = {
		title: "Create an Ai Powered Summary",
		description:
			"This is where the real power lies. If you find long interviews, 2-hour podcast episodes or lectures on YouTube then you simply need to copy the youtube link found by clicking on the youtube share button and paste it over here. Or enter a research topic for the Ai to summarise into easily digestable short intelligently analysed summaries for your convenience",
	} as const;

	return (
		<div className="h-full rounded-none px-0 mx-0 md:mx-3 flex flex-col lg:rounded-none md:rounded-none md:mt-0 md:p-8 md:w-full md:gap-y-4">
			<PageHeader title={content.title} description={content.description} />
			<CommonSectionWithChildren title={content.title} description={content.description}>
				<div className="flex flex-col-reverse lg:flex-row-reverse gap-0 md:gap-0 px-0 mx-0 md:mx-0 md:mb-0">
					<UsageDisplay />
					<EpisodeCreator />
				</div>
			</CommonSectionWithChildren>
		</div>
	);
}
