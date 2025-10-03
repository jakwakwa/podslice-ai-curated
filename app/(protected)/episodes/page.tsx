"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EpisodeList } from "@/components/episode-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppSpinner } from "@/components/ui/app-spinner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { H3 } from "@/components/ui/typography";
import type { Episode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";

export default function EpisodesPage() {
	const [episodes, setEpisodes] = useState<Episode[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { setEpisode } = useAudioPlayerStore();

	const fetchEpisodes = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await fetch(`/api/episodes?ts=${Date.now()}`, { cache: "no-store" });

			if (!response.ok) {
				throw new Error(`Failed to load episodes. Server responded with status ${response.status}.`);
			}

			const episodesData = await response.json();
			setEpisodes(episodesData);
		} catch (error) {
			console.error("Error fetching episodes:", error);
			setError(error instanceof Error ? error.message : "An unexpected error occurred while loading episodes.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchEpisodes();
	}, [fetchEpisodes]);

	const handlePlayEpisode = (episode: Episode) => {
		console.log("Episodes - Setting episode:", episode);
		setEpisode(episode);
	};

	return (
		<div className="w-full episode-card-wrapper">
			<PageHeader
				title="Weekly Roundup Bundle Episodes"
				description="Choose from our pre-curated podcast bundles. Each bundle is a fixed selection of 2-5 carefully selected shows and cannot be modified once selected."
			/>

			{isLoading ? (
				<div className="px-0 md:p-6 mx-auto">
					<div className="flex items-center justify-center min-h-[500px]">
						<AppSpinner variant={"wave"} size="lg" label="Loading Podslice Episodes..." />
					</div>
				</div>
			) : error ? (
				<div className="max-w-2xl mx-auto mt-8">
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertTitle>Unable to Load Episodes</AlertTitle>
						<AlertDescription className="mt-2">{error}</AlertDescription>
					</Alert>
					<div className="mt-6 text-center">
						<Button onClick={fetchEpisodes} variant="outline">
							<RefreshCw className="h-4 w-4 mr-2" />
							Try Again
						</Button>
					</div>
				</div>
			) : episodes.length === 0 ? (
				<div className="w-full  max-w-[1000px] mx-auto mt-0">
					<Alert>
						<AlertTitle>No Episodes Available</AlertTitle>
						<AlertDescription className="mt-2">There are no episodes available at the moment. Create a personal feed or select a bundle to start getting episodes.</AlertDescription>
					</Alert>
				</div>
			) : (
				<div className="flex episode-card-wrapper mt-4 flex-col justify-center mx-auto w-screen md:w-screen max-w-full gap-4">
					<H3 className="font-medium">All Bundled Episodes</H3>
					<EpisodeList episodes={episodes} onPlayEpisode={handlePlayEpisode} />
				</div>
			)}
		</div>
	);
}
