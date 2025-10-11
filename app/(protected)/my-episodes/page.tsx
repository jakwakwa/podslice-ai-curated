import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { UserInfoPageLevelMsg } from "@/components/shared/info-messages.tsx/userinfo-pagelevel-msg";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { userIsActive } from "@/lib/usage";
import { CreateBundleModalWrapper } from "./_components/create-bundle-modal-wrapper";
import { EpisodeList } from "./_components/episode-list";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
	return { title: "My Episodes", description: "All your completed, generated episodes." };
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MyEpisodesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
	// Accept several possible keys from email deep links
	const sp = (await (searchParams ?? Promise.resolve({} as SearchParams))) as SearchParams;
	const idParam = (sp["episodeId"] ?? sp["id"] ?? sp["episode_id"]) as string | string[] | undefined;
	const initialEpisodeId = Array.isArray(idParam) ? idParam[0] : idParam;

	// Gate by active status
	const { userId } = await auth();
	let isActive = false;
	if (userId) {
		isActive = await userIsActive(prisma, userId);
	}

	return (
		<div className="flex md:episode-card-wrapper mt-0 flex-col justify-center mx-auto w-screen md:w-screen max-w-full">
			<PageHeader
				title="Your Generated Episodes"
				description={
					"View your recently generated episodes."
				}
				button={
					<div className="flex flex-col gap-4">
						<CreateBundleModalWrapper />
						<Button variant="default" size="sm" className="w-fit" disabled={!isActive}>
							<Link className="text-slate-200" href="/generate-my-episodes">
								Generate Episode
							</Link>
						</Button>
					</div>
				}
			/>

			{isActive ? <EpisodeList completedOnly initialEpisodeId={initialEpisodeId} /> : <UserInfoPageLevelMsg isActive={isActive} message="Your membership is inactive. Episodes you created are no longer accessible. Reactivate to generate and access episodes again." />}
		</div>
	);
}
