import type { Metadata } from "next";
import CommonSectionWithChildren from "@/components/shared/section-common";
import { PageHeader } from "@/components/ui/page-header";
import SummaryCreator from "../my-episodes/_components/summary-creator";

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
			"Summarise long-form podcasts, lectures or tutorials from youtube into concise, AI produced and analysed, generated audio and text summaries.",
	} as const;

	return (
		<div className="h-full rounded-none px-0 mx-0 md:mx-3 flex flex-col lg:rounded-none md:rounded-none md:mt-0 md:p-8 md:w-full md:gap-y-4">
			<PageHeader title={content.title} description={content.description} />
			<CommonSectionWithChildren title={content.title} description={content.description}>
				<div className="w-full px-0 md:px-0">
					<SummaryCreator />
				</div>
			</CommonSectionWithChildren>
		</div>
	);
}
