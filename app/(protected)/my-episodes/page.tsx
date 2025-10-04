import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EpisodeList } from "./_components/episode-list";
import { CreateBundleModalWrapper } from "./_components/create-bundle-modal-wrapper";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
	return { title: "My Episodes", description: "All your completed, generated episodes." };
}

export default async function MyEpisodesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
	// Accept several possible keys from email deep links
	const idParam = searchParams?.episodeId || searchParams?.id || searchParams?.episode_id;
	const initialEpisodeId = Array.isArray(idParam) ? idParam[0] : idParam;

	return (
		<div className="flex episode-card-wrapper mt-4 flex-col justify-center mx-auto w-screen md:w-screen max-w-full">
			<PageHeader 
				title="Your Generated Episodes" 
				description="View your recently generated episodes." 
				button={
					<div className="flex gap-2">
						<CreateBundleModalWrapper />
						<Button variant="default" size="sm" className="w-fit">
							<Link className="text-slate-900" href="/generate-my-episodes">
								Generate Episode
							</Link>
						</Button>
					</div>
				} 
			/>

			<EpisodeList completedOnly initialEpisodeId={initialEpisodeId} />
		</div>
	);
}
