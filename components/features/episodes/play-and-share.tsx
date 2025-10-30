"use client";

import { Play, Share2 } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
	onPublicStateChange?: (callback: (newIsPublic: boolean) => void) => void;
}

export default function PlayAndShare({
	kind,
	episode,
	signedAudioUrl,
	isPublic: initialIsPublic = false,
	onPublicStateChange,
}: PlayAndShareProps): ReactElement {
	const { setEpisode } = useAudioPlayerStore();
	const [showShareDialog, setShowShareDialog] = useState(false);
	const canPlay = Boolean(signedAudioUrl);

	// Local state for optimistic updates
	const [isPublic, setIsPublic] = useState(initialIsPublic);

	// Register callback for when toggle button updates the state
	useEffect(() => {
		if (onPublicStateChange) {
			onPublicStateChange((newIsPublic: boolean) => {
				setIsPublic(newIsPublic);
			});
		}
	}, [onPublicStateChange]);

	// Sync with prop changes (e.g., on initial load or page navigation)
	useEffect(() => {
		setIsPublic(initialIsPublic);
	}, [initialIsPublic]);

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
			<div className="w-full max-w-[10vw] flex md:flex-row my-8 items-start gap-4">
				<Button
					type="button"
					className="outline-teal-400 outline-1 max-h-10"
					variant="play"
					size="playSmall"
					onClick={onPlay}
					disabled={!canPlay}
					icon={<Play className="text-teal-300" />}>
					Play
				</Button>
				<Button
					type="button"
					className="outline-indigo-400 outline-1 max-h-10"
					variant="play"
					size="playSmall"
					onClick={onShare}
					icon={<Share2 className="text-indigo-300 max-h-7" />}>
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
