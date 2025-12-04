"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { UnifiedEpisodeList } from "@/components/episodes/unified-episode-list";
import SectionHeader from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEpisodePlayer } from "@/hooks/use-episode-player";
import { ONE_MINUTE } from "@/lib/swr";
import type { UserEpisode } from "@/lib/types";

type UserEpisodeWithSignedUrl = UserEpisode & { signedAudioUrl: string | null };

type EpisodeListProps = {
	completedOnly?: boolean;
	initialEpisodeId?: string | undefined;
};

type FilterType = "all" | "manual" | "auto";

export function EpisodeList({
	completedOnly = false,
	initialEpisodeId,
}: EpisodeListProps) {
	const { data, error, isLoading } = useSWR<UserEpisodeWithSignedUrl[]>(
		"/api/user-episodes/list",
		{ dedupingInterval: ONE_MINUTE * 5, revalidateOnFocus: false, keepPreviousData: true }
	);
	const [filter, setFilter] = useState<FilterType>("all");
	const [currentPage, setCurrentPage] = useState(1);

	const enableDebug = useMemo(
		() => process.env.NEXT_PUBLIC_ENABLE_EPISODE_DEBUG === "true",
		[]
	);
	const { playEpisode } = useEpisodePlayer();

	const episodesPerPage = 5;

	// Apply filters and pagination
	const { episodes, totalPages } = useMemo(() => {
		let filtered = (data ?? []).filter(e =>
			completedOnly ? e.status === "COMPLETED" : true
		);

		// Apply auto-generated filter
		if (filter === "manual") {
			filtered = filtered.filter(e => !e.auto_generated);
		} else if (filter === "auto") {
			filtered = filtered.filter(e => e.auto_generated);
		}

		const totalPages = Math.ceil(filtered.length / episodesPerPage);
		const startIndex = (currentPage - 1) * episodesPerPage;
		const endIndex = startIndex + episodesPerPage;
		const paginatedEpisodes = filtered.slice(startIndex, endIndex);

		return { episodes: paginatedEpisodes, totalPages };
	}, [data, completedOnly, filter, currentPage]);

	// Reset to page 1 when filter changes
	useEffect(() => {
		setCurrentPage(1);
	}, [filter]);

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
						summary_length: ep.summary_length,
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
						auto_generated: ep.auto_generated ?? false,
					};
					playEpisode(normalizedEpisode);
				}
			} catch {}
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
			summary_length: match.summary_length,
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
			auto_generated: match.auto_generated ?? false,
		};
		// Ensure we always set fresh episode on deep link
		playEpisode(normalizedEpisode);
	}, [initialEpisodeId, episodes, playEpisode]);

	if (error) {
		return <p className="text-red-500">{error.message}</p>;
	}

	const filterTabs = (
		<div className="mx-4 mb-4">
			<Tabs value={filter} onValueChange={value => setFilter(value as FilterType)}>
				<TabsList className="flex flex-col md:flex-row">
					<TabsTrigger value="all">
						All Episodes
						{data && (
							<span className="ml-1.5 text-xs opacity-60">
								(
								{
									data.filter(e => (completedOnly ? e.status === "COMPLETED" : true))
										.length
								}
								)
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="manual">
						Manual
						{data && (
							<span className="ml-1.5 text-xs opacity-60">
								(
								{
									data.filter(
										e =>
											(completedOnly ? e.status === "COMPLETED" : true) &&
											!e.auto_generated
									).length
								}
								)
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="auto">
						Auto-Generated
						{data && (
							<span className="ml-1.5 text-xs opacity-60">
								(
								{
									data.filter(
										e =>
											(completedOnly ? e.status === "COMPLETED" : true) &&
											e.auto_generated
									).length
								}
								)
							</span>
						)}
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);

	const emptyState = (
		<p className="text-primary m-4 text-sm">
			{filter === "manual"
				? "No manually created episodes found. Create one by generating a podcast summary!"
				: filter === "auto"
					? "No auto-generated episodes found. These are created automatically from your content preferences."
					: "You haven't created any episodes yet."}
		</p>
	);

	return (
		<div className="border bg-[var(--kwak-1)]/80 border-[rgba(227,114,244,0.14)] rounded-none overflow-hidden mb-0 p-0 mt-0 md:mt-0 md:m-0 md:px-1 outline-0 md:rounded-4xl md:shadow-xl">
			<div className="text-left md:pt-0 rounded-none my-0 py-0 md:mb-5 md:pb-0 overflow-hidden md:rounded-4xl md:py-0 min-w-full min-h-full lg:pl-12 bg-episode-card-wrapper">
				<div className="mx-4">
					<SectionHeader
						title="Your summaries "
						description="Love the long form podcast, but can't find time for it? Just paste the link of podcast show. Want to catch up on the latest news? Select your desired sources and topics and have the news analyst ai get the best updates for you"
					/>
				</div>

				<UnifiedEpisodeList
					episodes={episodes}
					isLoading={isLoading}
					pagination={{
						currentPage,
						totalPages,
						onPageChange: setCurrentPage,
					}}
					header={filterTabs}
					emptyState={emptyState}
					onPlayEpisode={ep => {
						// Create a normalized episode for the audio player
						// The playEpisode hook expects UserEpisode for user episodes
						// but UnifiedEpisodeList works with NormalizedEpisode internally for display.
						// However, the onPlayEpisode callback receives the original episode object.
						// We need to make sure we pass what useEpisodePlayer expects.
						// Since 'ep' here is from 'episodes' array which contains UserEpisodeWithSignedUrl,
						// we should just cast/pass it.
						// But wait, the original code did explicit normalization/copying.
						// We should replicate that to be safe, although it looks like it was just copying fields.
						const uep = ep as UserEpisodeWithSignedUrl;

						// Check all playable conditions (signed URL or public GCS URL) + COMPLETED status
						const hasPlayableAudio =
							uep.status === "COMPLETED" &&
							(!!uep.signedAudioUrl ||
								(!!uep.public_gcs_audio_url &&
									!uep.public_gcs_audio_url.startsWith("gs://")));

						if (hasPlayableAudio) {
							// Prefer signed URL, fallback to public GCS
							const audioUrl = uep.signedAudioUrl || uep.public_gcs_audio_url || "";

							const normalizedEpisode: UserEpisode = {
								episode_id: uep.episode_id,
								episode_title: uep.episode_title,
								gcs_audio_url: audioUrl,
								summary: uep.summary,
								summary_length: uep.summary_length,
								created_at: uep.created_at,
								updated_at: uep.updated_at,
								user_id: uep.user_id,
								youtube_url: uep.youtube_url,
								transcript: uep.transcript,
								status: uep.status,
								progress_message: uep.progress_message ?? null,
								duration_seconds: uep.duration_seconds,
								news_sources: uep.news_sources ?? null,
								news_topic: uep.news_topic ?? null,
								is_public: uep.is_public ?? false,
								public_gcs_audio_url: uep.public_gcs_audio_url ?? null,
								auto_generated: uep.auto_generated ?? false,
							};
							playEpisode(normalizedEpisode);
						}
					}}
					renderActions={ep => (
						<>
							{enableDebug && (
								<DebugLogDialog episodeId={(ep as UserEpisode).episode_id} />
							)}
						</>
					)}
					className="episode-card-wrapper-dark py-4 rounded-3xl lg:mt-8"
				/>
			</div>
		</div>
	);
}

function DebugLogDialog({ episodeId }: { episodeId: string }) {
	const [logs, setLogs] = useState<unknown[] | null>(null);
	const [loading, setLoading] = useState(false);

	const handleOpenChange = (open: boolean) => {
		if (open && !logs) {
			setLoading(true);
			fetch(`/api/user-episodes/${episodeId}/debug/logs`)
				.then(async res => {
					if (res.ok) {
						const data = await res.json();
						setLogs(data.events);
					}
				})
				.catch(e => {
					console.error(e);
				})
				.finally(() => {
					setLoading(false);
				});
		}
	};

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button size="sm" variant="secondary" className="ml-2">
					View Run Log
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Debug Logs</DialogTitle>
				</DialogHeader>
				<div className="mt-2 p-2 bg-gray-50 rounded">
					{loading ? (
						<p>Loading logs...</p>
					) : (
						<pre className="text-[11px] whitespace-pre-wrap break-words">
							{JSON.stringify(logs, null, 2)}
						</pre>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
