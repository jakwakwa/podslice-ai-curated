"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Bundle, Episode, Podcast } from "@/lib/types";
import PanelHeader from "./PanelHeader";

// Define the shape of props as expected from the server component
type ShapedEpisode = Episode & {
	podcast: Podcast;
	bundle: { bundle_id: string; name: string } | null;
};

export default function EpisodesManagementPanelClient({
	episodes,
}: {
	episodes: ShapedEpisode[];
	bundles: Bundle[];
}) {
	const [searchTerm, setSearchTerm] = useState("");

	// Filter episodes based on search
	const filteredEpisodes = episodes.filter(
		e =>
			e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			e.podcast.name.toLowerCase().includes(searchTerm.toLowerCase())
	);

	return (
		<div className="grid grid-cols-1 gap-4">
			<Card>
				<PanelHeader
					title={`Episodes (${episodes.length})`}
					description="View and manage generated episodes"
				/>
				<div className="p-4">
					<div className="mb-4">
						<Label htmlFor="search">Search Episodes</Label>
						<Input
							id="search"
							placeholder="Search by title or podcast name..."
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						{filteredEpisodes.length === 0 ? (
							<p className="text-center text-muted-foreground py-4">No episodes found.</p>
						) : (
							filteredEpisodes.map(episode => (
								<div
									key={episode.episode_id}
									className="p-3 bg-card border rounded-lg flex flex-col md:flex-row justify-between gap-4">
									<div className="flex-1 min-w-0">
										<h4 className="font-medium truncate" title={episode.title}>
											{episode.title}
										</h4>
										<p className="text-sm text-muted-foreground truncate">
											{episode.podcast.name}
										</p>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										{episode.bundle ? (
											<Badge variant="secondary">{episode.bundle.name}</Badge>
										) : (
											<Badge variant="outline" className="text-muted-foreground">
												No Bundle
											</Badge>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</Card>
		</div>
	);
}
