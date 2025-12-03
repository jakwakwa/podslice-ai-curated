import { Calendar, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Episode } from "@/lib/types";

// CSS module migrated to Tailwind classes

interface PodcastCardProps {
	episode: Episode;
	onPlayEpisode: (episode: Episode) => void;
}

/* JS DOC */
/**
 * @description This component is used to display a podcast card.
 * @param {Object} props - The component props
 * @param {Episode} props.episode - The episode data
 * @param {Function} props.onPlayEpisode - The function to play the episode
 * @returns {JSX.Element} The PodcastCard component (Card)
 */
export function PodcastCard({ episode, onPlayEpisode }: PodcastCardProps) {
	return (
		<Card
			variant="dunk"
			className="flex flex-col w-full bg-gradient-to-br from-gray-900 to-gray-800">
			<CardHeader>
				<CardTitle className="text-xl font-semibold leading-7 tracking-tight">
					{episode.title}
				</CardTitle>
				<CardDescription className="flex items-start gap-2 text-base md:text-sm">
					<Calendar className="h-4 w-4" />
					<span>
						{episode.published_at
							? new Date(episode.published_at).toLocaleDateString()
							: "N/A"}
					</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="flex">
				<div className="flex items-center justify-between w-full">
					<div className="text-sm text-muted-foreground">
						<Clock className="h-4 w-4" />
						<span>{episode.audio_url ? "Available" : "N/A"}</span>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<Button
					className="w-full"
					disabled={!episode.audio_url}
					onClick={() => onPlayEpisode(episode)}
					variant="default">
					<PlayCircle className="mr-2 h-4 w-4" />
					Play Episode
				</Button>
			</CardFooter>
		</Card>
	);
}
