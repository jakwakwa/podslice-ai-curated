"use client";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { FC } from "react";
import { useYouTubeChannel } from "@/hooks/useYouTubeChannel";
import type { Episode, UserEpisode } from "@/lib/types";

type ArtworkProps = {
  episode: Episode | UserEpisode | null;
};

export const Artwork: FC<ArtworkProps> = ({ episode }) => {
  // Get YouTube channel name and image for user episodes
  const youtubeUrl = episode && "youtube_url" in episode ? episode.youtube_url : null;

  const { channelName: youtubeChannelName, channelImage: youtubeChannelImage, isLoading: isChannelLoading } = useYouTubeChannel(youtubeUrl);

  if (!episode) return null;

  // For bundle episodes, use the episode's image_url
  if ("image_url" in episode && episode.image_url) {
    return (
      <div className="aspect-[16/9] shadow-black/40 shadow-xl h-auto w-full shrink-0 rounded-xl mx-auto max-w-[200px] border-4 border-[#000] overflow-hidden flex justify-center items-center">
        <div className="overflow-hidden h-auto w-full shrink-0 mx-auto aspect-[16/12]">
          <Image src={episode.image_url} alt={episode.title} width={200} height={100} className="outline-2 outline-[#9ecaf53d] shadow-black shadow-xl object-cover" />
        </div>
      </div>
    );
  }

  // For user episodes, use YouTube channel image if available
  if ("youtube_url" in episode) {
    if (youtubeChannelImage) {
      return (
        <div className="shadow-mdshadow-black aspect-square shadow-black/40 shadow-xl h-auto w-full shrink-0 rounded-4xl mx-auto max-w-[100px] border-4 border-[#9ecaf5f] overflow-hidden flex">
          <div className="overflow-hidden h-auto w-full shrink-0 mx-auto max-w-[100px] aspect-square">
            <Image src={youtubeChannelImage} alt={youtubeChannelName || "YouTube Channel"} width={200} height={200} className="w-full h-full object-cover" />
          </div>
        </div>
      );
    }

    // Show loading state for user episodes while fetching channel image
    if (isChannelLoading) {
      return (
        <div className="h-auto w-full rounded-[19.8347px] bg-gray-600 animate-pulse shadow-[0px_5.607px_5.607px_rgba(0,0,0,0.3),0px_11.2149px_16.8224px_8.4112px_rgba(0,0,0,0.15)] mx-auto max-w-[120px] aspect-square flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-gray-400" />
        </div>
      );
    }
  }

  return null;
};
