"use client";

import { Play, Share2 } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Episode, UserEpisode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";
import { ShareDialog } from "./share-dialog";

type Kind = "user" | "curated";

interface PlayAndShareProps {
	kind: Kind;
	episode: Episode | UserEpisode;
	signedAudioUrl: string | null;
	isPublic?: boolean;
}

export default function PlayAndShare({
	kind,
	episode,
	signedAudioUrl,
	isPublic = false,
}: PlayAndShareProps): ReactElement {
	const { setEpisode } = useAudioPlayerStore();
	const [showShareDialog, setShowShareDialog] = useState(false);
	const canPlay = Boolean(signedAudioUrl);

	// Generate share URL - if public, use the public route
	const shareUrl = useMemo(() => {
		if (typeof window === "undefined") return "";
		if (kind === "user" && isPublic) {
			const episodeId = (episode as UserEpisode).episode_id;
			return `${window.location.origin}/shared/episodes/${episodeId}`;
		}
		return window.location.href;
	}, [kind, isPublic, episode]);

	// Get episode title
	const title = useMemo(() => {
		return kind === "curated"
			? (episode as Episode).title
			: (episode as UserEpisode).episode_title;
	}, [kind, episode]);

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

	const onShare = useCallback(() => {
		// If episode is not public, show a warning but still allow sharing
		if (kind === "user" && !isPublic) {
			toast.warning("Episode is private", {
				description: "Set this episode to public to share it with others",
			});
		}
		setShowShareDialog(true);
	}, [kind, isPublic]);

	return (
		<>
			<div className="flex flex-col md:flex-row my-4 items-center gap-4">
				<Button
					type="button"
					variant="play"
					size="playSmall"
					onClick={onPlay}
					disabled={!canPlay}
					icon={<Play />}>
					Play
				</Button>
				<Button
					type="button"
					variant="play"
					size="playSmall"
					onClick={onShare}
					icon={<Share2 />}>
					Share
				</Button>
			</div>

			<ShareDialog
				open={showShareDialog}
				onOpenChange={setShowShareDialog}
				title={title}
				shareUrl={shareUrl}
				isPublic={isPublic}
			/>
		</>
	);
}
