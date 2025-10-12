"use client";

import { Play, Share2 } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Episode, UserEpisode } from "@/lib/types";
import { useAudioPlayerStore } from "@/store/audioPlayerStore";

type Kind = "user" | "curated";

interface PlayAndShareProps {
  kind: Kind;
  episode: Episode | UserEpisode;
  signedAudioUrl: string | null;
  isPublic?: boolean;
}

export default function PlayAndShare({ kind, episode, signedAudioUrl, isPublic = false }: PlayAndShareProps): ReactElement {
  const { setEpisode } = useAudioPlayerStore();
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

      // If episode is not public, show a warning
      if (kind === "user" && !isPublic) {
        toast.warning("Episode is private", {
          description: "Set this episode to public to share it with others",
        });
      }

      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied", {
        description: isPublic ? "Anyone with this link can listen" : "Link copied to clipboard",
      });
    } catch (e) {
      console.warn("Share failed", e);
    }
  }, [episode, kind, shareUrl, isPublic]);

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
