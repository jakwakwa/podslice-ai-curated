"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayButton } from "@/components/episodes/play-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EpisodeCard from "@/components/ui/episode-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEpisodePlayer } from "@/hooks/use-episode-player";
import type { UserEpisode } from "@/lib/types";

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
    const { playEpisode } = useEpisodePlayer();

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
                const ep: UserEpisode & { signedAudioUrl: string | null } = await res.json();
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
                        progress_message: ep.progress_message ?? null,
                        duration_seconds: ep.duration_seconds,
                        news_sources: ep.news_sources ?? null,
                        news_topic: ep.news_topic ?? null,
                        is_public: ep.is_public ?? false,
                        public_gcs_audio_url: ep.public_gcs_audio_url ?? null,
                    };
                    playEpisode(normalizedEpisode);
                }
            } catch { }
        })();
        return () => {
            aborted = true;
        };
    }, [initialEpisodeId, playEpisode]);

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
            progress_message: match.progress_message ?? null,
            duration_seconds: match.duration_seconds,
            news_sources: match.news_sources ?? null,
            news_topic: match.news_topic ?? null,
            is_public: match.is_public ?? false,
            public_gcs_audio_url: match.public_gcs_audio_url ?? null,
        };
        // Ensure we always set fresh episode on deep link
        playEpisode(normalizedEpisode);
    }, [initialEpisodeId, episodes, playEpisode]);

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

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    return (
        <div className="px-2 mx-0 py-5 pb-28 mt-0	 md:px-8 md:py-8 bg-bigcard md:rounded-4xl h-full w-screen md:w-full md:mx-2 md:bg-bigcard md:p-12">
            <div className="episode-card-wrapper-dark rounded-3xl flex flex-col gap-2">
                {isLoading ? (
                    <Card variant="default">
                        <CardContent className=" space-y-2 flex-col flex w-full">
                            <Skeleton className="bg-[#2f4383]/30 h-[105px] w-full animate-pulse" />
                            <Skeleton className="bg-[#2f4383]/30 h-[105px] w-full animate-pulse" />
                            <Skeleton className="bg-[#2f4383]/30 h-[105px] w-full animate-pulse" />
                        </CardContent>
                    </Card>
                ) : episodes.length === 0 ? (
                    <p className="text-primary m-4 text-sm">You haven't created any episodes yet.</p>
                ) : (
                    episodes.map(episode => (
                        <div key={episode.episode_id} className="py-0">
                            <EpisodeCard
                                imageUrl={null}
                                title={episode.episode_title}
                                publishedAt={episode.created_at}
                                durationSeconds={episode.duration_seconds ?? null}
                                youtubeUrl={episode.youtube_url}
                                detailsHref={`/my-episodes/${episode.episode_id}`}
                                isNewsEpisode={!!(episode.news_sources || episode.news_topic)}
                                actions={
                                    <>
                                        {episode.status === "COMPLETED" && episode.signedAudioUrl && (
                                            <PlayButton
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
                                                        progress_message: episode.progress_message ?? null,
                                                        duration_seconds: episode.duration_seconds,
                                                        news_sources: episode.news_sources ?? null,
                                                        news_topic: episode.news_topic ?? null,
                                                        is_public: episode.is_public ?? false,
                                                        public_gcs_audio_url: episode.public_gcs_audio_url ?? null,
                                                    };
                                                    playEpisode(normalizedEpisode);
                                                }}
                                                aria-label={`Play ${episode.episode_title}`}
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
        </div>
    );
}
