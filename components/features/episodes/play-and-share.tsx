"use client";

import { Play, Share2 } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { Episode, UserEpisode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";

type Kind = "user" | "curated";

interface PlayAndShareProps {
	kind: Kind;
	episode: Episode | UserEpisode;
	signedAudioUrl: string | null;
}

export default function PlayAndShare({ kind, episode, signedAudioUrl }: PlayAndShareProps): ReactElement {
	const { setEpisode } = useAudioPlayerStore();
	const canPlay = Boolean(signedAudioUrl);

	const shareUrl = useMemo(() => {
		if (typeof window === "undefined") return "";
		return window.location.href;
	}, []);

	const onPlay = useCallback(() => {
		if (!canPlay) return;
		const url = signedAudioUrl;
		if (typeof url !== "string" || url.length === 0) return;

		if (kind === "curated") {
			const normalized: Episode = { ...(episode as Episode), audio_url: url };
			setEpisode(normalized as unknown as Episode);
		} else {
			const normalized: UserEpisode = { ...(episode as UserEpisode), gcs_audio_url: url };
			setEpisode(normalized as unknown as UserEpisode);
		}
	}, [canPlay, episode, kind, setEpisode, signedAudioUrl]);

	const onShare = useCallback(async () => {
		try {
			const title = kind === "curated" ? (episode as Episode).title : (episode as UserEpisode).episode_title;
			if (navigator.share) {
				await navigator.share({ title, url: shareUrl });
				return;
			}
			await navigator.clipboard.writeText(shareUrl);
			// Keep UX lightweight; toast optional
			console.log("Copied link:", shareUrl);
		} catch (e) {
			console.warn("Share failed", e);
		}
	}, [episode, kind, shareUrl]);

	return (
		<div className="flex items-center gap-4">
			<Button type="button" variant="play" size="playLarge" onClick={onPlay} disabled={!canPlay} icon={<Play />}>
				Play
			</Button>
			<Button type="button" variant="play" size="playLarge" onClick={onShare} icon={<Share2 />}>
				Share
			</Button>
		</div>
	);
}
