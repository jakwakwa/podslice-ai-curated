/**
 * Episodes skeleton components
 * Reusable loading skeletons for episode-related sections
 */

import { CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EpisodesFilterSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="bg-[#2f4383]/30 h-[45px] w-full animate-pulse" />
			<Skeleton className="bg-[#2f4383]/30 h-[45px] w-full animate-pulse max-w-1/2" />
		</div>
	);
}

export function EpisodeCardSkeleton() {
	return <Skeleton className="bg-[#2f4383]/30 h-[105px] w-full animate-pulse" />;
}

export function EpisodesListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<CardContent className="md:episode-card-wrapper-dark space-y-2 flex-col flex w-full">
			{Array.from({ length: count }).map((_, i) => (
				<EpisodeCardSkeleton key={i} />
			))}
		</CardContent>
	);
}

export function EpisodesPageSkeleton() {
	return (
		<div className="px-6 py-14 md:px-8 md:pt-12 md:mt-4 border-1 border-input-border rounded-4xl mx-auto bg-big-card">
			<div className="flex flex-col gap-4">
				<EpisodesFilterSkeleton />
				<EpisodesListSkeleton />
			</div>
		</div>
	);
}
