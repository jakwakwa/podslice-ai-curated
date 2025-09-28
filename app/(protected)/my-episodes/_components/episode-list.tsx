"use client";

import { PlayIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EpisodeCard from "@/components/ui/episode-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserEpisode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";

type UserEpisodeWithSignedUrl = UserEpisode & { signedAudioUrl: string | null };

type EpisodeListProps = {
	completedOnly?: boolean;
	initialEpisodeId?: string | undefined;
};

export function EpisodeList({ completedOnly = false, initialEpisodeId }: EpisodeListProps) {
	const [episodes, setEpisodes] = useState<UserEpisodeWithSignedUrl[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [debugLogs, setDebugLogs] = useState<Record<string, unknown[]> | null>(null);
	const enableDebug = useMemo(() => process.env.NEXT_PUBLIC_ENABLE_EPISODE_DEBUG === "true", []);
	const { setEpisode } = useAudioPlayerStore();

	useEffect(() => {
		const fetchEpisodes = async () => {
			try {
				const res = await fetch("/api/user-episodes/list");
				if (!res.ok) {
					throw new Error("Failed to fetch episodes.");
				}
				const data: UserEpisodeWithSignedUrl[] = await res.json();
				setEpisodes(completedOnly ? data.filter(e => e.status === "COMPLETED") : data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An unknown error occurred.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchEpisodes();
	}, [completedOnly]);

	// If we arrived via deep link, fetch the single episode immediately to avoid showing stale progress
	useEffect(() => {
		if (!initialEpisodeId) return;
		let aborted = false;
		(async () => {
			try {
				const res = await fetch(`/api/user-episodes/${initialEpisodeId}`);
				if (!res.ok) return;
				const ep: (UserEpisode & { signedAudioUrl: string | null }) = await res.json();
				if (aborted) return;
				if (ep && ep.status === "COMPLETED" && ep.signedAudioUrl) {
					const normalizedEpisode: UserEpisode = {
						episode_id: ep.episode_id,
						episode_title: ep.episode_title,
						gcs_audio_url: ep.signedAudioUrl,
						summary: ep.summary,
						created_at: ep.created_at,
						updated_at: ep.updated_at,
						user_id: ep.user_id,
						youtube_url: ep.youtube_url,
						transcript: ep.transcript,
						status: ep.status,
						duration_seconds: ep.duration_seconds,
					};
					setEpisode(normalizedEpisode);
				}
			} catch { }
		})();
		return () => {
			aborted = true;
		};
	}, [initialEpisodeId, setEpisode]);

	// Auto-select and open the episode if initialEpisodeId is provided (deep link)
	useEffect(() => {
		if (!initialEpisodeId || episodes.length === 0) return;
		const targetId = String(initialEpisodeId);
		const match = episodes.find(e => e.episode_id === targetId);
		if (!match || match.status !== "COMPLETED" || !match.signedAudioUrl) return;

		const normalizedEpisode: UserEpisode = {
			episode_id: match.episode_id,
			episode_title: match.episode_title,
			gcs_audio_url: match.signedAudioUrl,
			summary: match.summary,
			created_at: match.created_at,
			updated_at: match.updated_at,
			user_id: match.user_id,
			youtube_url: match.youtube_url,
			transcript: match.transcript,
			status: match.status,
			duration_seconds: match.duration_seconds,
		};
		// Ensure we always set fresh episode on deep link
		setEpisode(normalizedEpisode);
	}, [initialEpisodeId, episodes, setEpisode]);

	const handleViewRunLog = async (episodeId: string): Promise<void> => {
		try {
			const res = await fetch(`/api/user-episodes/${episodeId}/debug/logs`);
			if (!res.ok) throw new Error(await res.text());
			const data: { events: unknown[] } = await res.json();
			setDebugLogs(prev => ({ ...(prev || {}), [episodeId]: data.events }));
		} catch (e) {
			console.error(e);
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="space-y-4 flex-col flex w-full">
					<Skeleton className="bg-[#1b181f] h-50 w-full" />
					<Skeleton className="bg-[#1b181f] h-50 w-full" />
					<Skeleton className="bg-[#1b181f] h-50 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return <p className="text-red-500">{error}</p>;
	}

	return (
		<Card className="episode-card-wrapper-dark h-full min-h-[61vh]">
			<div>
				{episodes.length === 0 ? (
					<p>You haven't created any episodes yet.</p>
				) : (
					episodes.map(episode => (
						<div key={episode.episode_id} className="p-1">
							<EpisodeCard
								imageUrl={null}
								title={episode.episode_title}
								publishedAt={episode.created_at}
								durationSeconds={episode.duration_seconds ?? null}
								youtubeUrl={episode.youtube_url}
								detailsHref={`/my-episodes/${episode.episode_id}`}
								actions={
									<>
										{episode.status === "COMPLETED" && episode.signedAudioUrl && (
											<Button
												onClick={() => {
													// Create a normalized episode for the audio player
													const normalizedEpisode: UserEpisode = {
														episode_id: episode.episode_id,
														episode_title: episode.episode_title,
														gcs_audio_url: episode.signedAudioUrl,
														summary: episode.summary,
														created_at: episode.created_at,
														updated_at: episode.updated_at,
														user_id: episode.user_id,
														youtube_url: episode.youtube_url,
														transcript: episode.transcript,
														status: episode.status,
														duration_seconds: episode.duration_seconds,
													};
													setEpisode(normalizedEpisode);
												}}
												variant="play"
												size="sm"
												className={`inline-flex p-0 border-0 rounded-full items-center justify-center btn-playicon rounded-[14px] outline-accent outline-1 w-32`}
												icon={<PlayIcon />}
											/>
										)}
										{enableDebug && (
											<Button size="sm" variant="secondary" className="ml-2" onClick={() => handleViewRunLog(episode.episode_id)}>
												View Run Log
											</Button>
										)}
									</>
								}
							/>
							{enableDebug && debugLogs && debugLogs[episode.episode_id] && (
								<div className="mt-2 p-2 bg-gray-50 rounded border">
									<pre className="text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(debugLogs[episode.episode_id], null, 2)}</pre>
								</div>
							)}
						</div>
					))
				)}
			</div>
		</Card>
	);
}
