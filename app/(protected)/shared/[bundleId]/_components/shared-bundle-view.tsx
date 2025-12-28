"use client";

import { Check, Play, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserEpisode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";

interface BundleEpisode {
	episode_id: string;
	display_order: number;
	episode_title: string;
	duration_seconds: number | null;
	audio_file_path: string;
	created_at: string;
}

interface SharedBundle {
	shared_bundle_id: string;
	name: string;
	description: string | null;
	created_at: string;
	owner: {
		full_name: string;
	};
	episodes: BundleEpisode[];
	total_episodes: number;
}

interface SharedBundleViewProps {
	bundle: SharedBundle;
	bundleId: string;
}

export function SharedBundleView({ bundle, bundleId }: SharedBundleViewProps) {
	const [loadingEpisode, setLoadingEpisode] = useState<string | null>(null);
	const [copiedLink, setCopiedLink] = useState(false);
	const { setEpisode } = useAudioPlayerStore();

	const playEpisode = async (episode: BundleEpisode) => {
		setLoadingEpisode(episode.episode_id);

		try {
			// Fetch signed URL from the play endpoint
			const response = await fetch(
				`/api/public/shared-bundles/${bundleId}/episodes/${episode.episode_id}/play`
			);

			if (!response.ok) {
				throw new Error("Failed to get audio URL");
			}

			const { signedUrl } = await response.json();

			// Create a normalized UserEpisode for the audio player
			const normalizedEpisode: UserEpisode = {
				episode_id: episode.episode_id,
				episode_title: episode.episode_title,
				gcs_audio_url: signedUrl,
				summary: null,
				summary_length: "MEDIUM", // Default value for shared bundles
				created_at: new Date(episode.created_at),
				updated_at: new Date(episode.created_at),
				user_id: "", // Not needed for playback
				youtube_url: "", // Not available for shared bundles
				transcript: null,
				status: "COMPLETED",
				duration_seconds: episode.duration_seconds,
				news_sources: null,
				progress_message: null,
				news_topic: null,
				is_public: false,
				public_gcs_audio_url: null,
				auto_generated: false,
				sentiment: null,
				sentiment_score: null,
				mentioned_assets: null,
				voice_archetype: null,
				reference_doc_url: null,
				context_weight: null,
			};

			setEpisode(normalizedEpisode as unknown as UserEpisode);

			toast.success(`Now playing: ${episode.episode_title}`);
		} catch (error) {
			console.error("[PLAY_EPISODE]", error);
			toast.error("Failed to play episode");
		} finally {
			setLoadingEpisode(null);
		}
	};

	const copyShareLink = async () => {
		const shareUrl = `${window.location.origin}/shared/${bundleId}`;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopiedLink(true);
			setTimeout(() => setCopiedLink(false), 2000);
			toast.success("Share link copied to clipboard!");
		} catch (error) {
			console.error("[COPY_LINK]", error);
			toast.error("Failed to copy link");
		}
	};

	const totalDuration = bundle.episodes.reduce(
		(acc, ep) => acc + (ep.duration_seconds || 0),
		0
	);

	return (
		<div className="flex episode-card-wrapper mt-4 flex-col justify-center mx-auto w-screen md:w-screen max-w-full">
			<Card className="mb-6">
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<CardTitle className="text-2xl mb-2">{bundle.name}</CardTitle>
							{bundle.description && (
								<p className="text-muted-foreground mb-4">{bundle.description}</p>
							)}
							<div className="flex items-center gap-4 text-sm text-muted-foreground">
								<span>Shared by {bundle.owner.full_name}</span>
								<span>•</span>
								<span>{bundle.total_episodes} episodes</span>
								<span>•</span>
								<span>{Math.floor(totalDuration / 60)} min total</span>
							</div>
						</div>
						<Button variant="outline" size="sm" onClick={copyShareLink}>
							{copiedLink ? (
								<>
									<Check className="h-4 w-4 mr-1" />
									Copied
								</>
							) : (
								<>
									<Share2 className="h-4 w-4 mr-1" />
									Share
								</>
							)}
						</Button>
					</div>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Episodes</CardTitle>
				</CardHeader>
				<CardContent>
					{bundle.episodes.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">
							No episodes available in this bundle.
						</p>
					) : (
						<div className="space-y-3">
							{bundle.episodes.map((episode, index) => (
								<div
									key={episode.episode_id}
									className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
									<div className="flex items-center gap-4 flex-1 min-w-0">
										<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
											{index + 1}
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-medium truncate">{episode.episode_title}</h4>
											<p className="text-xs text-muted-foreground">
												{new Date(episode.created_at).toLocaleDateString()} •{" "}
												{episode.duration_seconds
													? `${Math.floor(episode.duration_seconds / 60)}m`
													: "Duration unknown"}
											</p>
										</div>
									</div>
									<Button
										variant="default"
										size="sm"
										onClick={() => playEpisode(episode)}
										disabled={loadingEpisode === episode.episode_id}>
										<Play className="h-4 w-4 mr-1" />
										{loadingEpisode === episode.episode_id ? "Loading..." : "Play"}
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
