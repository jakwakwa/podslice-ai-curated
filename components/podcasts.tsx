import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Episode } from "@/lib/types";

interface PodcastListProps {
	episodes: Episode[];
}

export function PodcastList({ episodes }: PodcastListProps) {
	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Latest Episodes</CardTitle>
				<CardDescription>Manage and listen to your AI-generated podcast episodes.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-1 sm:grid-cols-1 lg:grid-cols-2">
					{episodes
						.filter(episode => episode.profile_id)
						.map(episode => (
							<div key={episode.episode_id} className="p-4 border rounded-lg space-y-3">
								<div>
									<div className="font-semibold text-sm truncate mb-1">{episode.title}</div>
									{episode.profile_id && <div className="text-xs text-primary">Profile ID: {episode.profile_id}</div>}
								</div>

								{episode.description && <div className="text-sm text-muted-foreground line-clamp-3">{episode.description}</div>}

								<div className="flex items-center gap-3">
									{episode.image_url && <Image src={episode.image_url} alt="Episode" className="rounded object-cover" width={60} height={60} />}
									<span className="text-xs text-muted-foreground">Podcast ID: {episode.podcast_id}</span>
								</div>
							</div>
						))}
				</div>
			</CardContent>
		</Card>
	);
}
