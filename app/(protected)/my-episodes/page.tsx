import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { UserInfoPageLevelMsg } from "@/components/shared/info-messages.tsx/userinfo-pagelevel-msg";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { userIsActive } from "@/lib/usage";
import { EpisodeList } from "./_components/episode-list";
import { myEpisodesContent } from "./content";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "My Episodes",
		description: "All your completed, generated summaries.",
	};
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MyEpisodesPage({
	searchParams,
}: {
	searchParams?: Promise<SearchParams>;
}) {
	// Accept several possible keys from email deep links
	const sp = (await (searchParams ??
		Promise.resolve({} as SearchParams))) as SearchParams;
	const idParam = (sp.episodeId ?? sp.id ?? sp.episode_id) as
		| string
		| string[]
		| undefined;
	const initialEpisodeId = Array.isArray(idParam) ? idParam[0] : idParam;

	// Gate by active status
	const { userId } = await auth();
	let isActive = false;
	if (userId) {
		isActive = await userIsActive(prisma, userId);
	}

	const { header } = myEpisodesContent;
	return (
		<div className="my-blur animated-background h-full min-h-[84vh] rounded-none px-0 mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl md:mt-0 md:p-8 md:w-full md:gap-5 ">
			<PageHeader
				title={header.title}
				description={header.description}
				button={
					<div className="flex flex-col py-4 gap-4 ">
						{/* <CreateBundleModalWrapper /> */}
						<Button variant="default" size="lg" className="w-fit" disabled={!isActive}>
							<Link className="text-slate-200" href={header.cta.href}>
								{header.cta.text}
							</Link>
						</Button>
					</div>
				}
			/>

			{isActive ? (
				<EpisodeList completedOnly initialEpisodeId={initialEpisodeId} />
			) : (
				<UserInfoPageLevelMsg isActive={isActive} message={header.inactiveMessage} />
			)}
		</div>
	);
}
