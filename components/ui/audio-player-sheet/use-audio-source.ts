import { useEffect, useRef, useState } from "react";
import type { Episode, UserEpisode } from "@/lib/types";

type Args = { open: boolean; episode: Episode | UserEpisode | null };
type Result = { resolvedSrc: string; isResolving: boolean; error: string | null };

function isUserEpisodeType(e: Episode | UserEpisode): e is UserEpisode {
	return typeof e === "object" && e !== null && "youtube_url" in e && !("podcast_id" in e);
}

export function useAudioSource({ open, episode }: Args): Result {
	const [resolvedSrc, setResolvedSrc] = useState("");
	const [isResolving, setIsResolving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortedRef = useRef(false);

	useEffect(() => {
		abortedRef.current = false;
		async function resolve() {
			if (!(open && episode)) {
				setResolvedSrc("");
				return;
			}
			setIsResolving(true);
			setError(null);

			const raw = "audio_url" in episode && episode.audio_url ? episode.audio_url : "gcs_audio_url" in episode && episode.gcs_audio_url ? episode.gcs_audio_url : "";

			// No direct gs://
			if (raw && !raw.startsWith("gs://") && !raw.startsWith("/api/episodes/") && !raw.startsWith("/api/user-episodes/")) {
				setResolvedSrc(raw);
				setIsResolving(false);
				return;
			}

			// Construct play endpoint when needed
			const id = episode.episode_id;
			const isUserEpisode = isUserEpisodeType(episode);

			try {
				const playEndpoint = raw.startsWith("/api/") ? raw : id ? (isUserEpisode ? `/api/user-episodes/${id}/play` : `/api/episodes/${id}/play`) : "";
				if (!playEndpoint) {
					setResolvedSrc("");
					setIsResolving(false);
					return;
				}
				const res = await fetch(playEndpoint, { cache: "no-store" });
				if (!res.ok) throw new Error("Failed to resolve signed URL");
				const data: { signedUrl?: string } = await res.json();
				if (!abortedRef.current) setResolvedSrc(data.signedUrl || "");
			} catch (e: unknown) {
				if (!abortedRef.current) {
					setResolvedSrc("");
					setError(e instanceof Error ? e.message : "Source resolution failed");
				}
			} finally {
				if (!abortedRef.current) setIsResolving(false);
			}
		}
		void resolve();
		return () => {
			abortedRef.current = true;
		};
	}, [open, episode]);

	return { resolvedSrc, isResolving, error };
}
