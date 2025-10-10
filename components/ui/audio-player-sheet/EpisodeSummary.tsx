"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getEpisodeSubtitle } from "@/lib/episodes/normalize";
import { normalizeSummaryMarkdown } from "@/lib/markdown/episode-text";
import type { Episode, UserEpisode } from "@/lib/types";

type EpisodeSummaryProps = {
  episode: Episode | UserEpisode | null;
  isExpanded?: boolean;
};

export const EpisodeSummary: FC<EpisodeSummaryProps> = ({ episode, isExpanded }) => {
  const [isTranscriptExpanded, _setIsTranscriptExpanded] = useState<boolean>(Boolean(isExpanded));

  const rawSummaryOrDescription = useMemo(() => {
    if (!episode) return null;
    if ("summary" in episode && episode.summary) return episode.summary as string;
    if ("description" in episode && episode.description) return episode.description as string;
    return null;
  }, [episode]);

  const normalizedSummary = useMemo(() => (rawSummaryOrDescription ? normalizeSummaryMarkdown(rawSummaryOrDescription) : null), [rawSummaryOrDescription]);

  if (!episode) return null;

  return (
    <div className="bg-[#16172262] backdrop-blur-md rounded-none">
      {/* Transcript */}
      <AnimatePresence initial={false}>
        {isTranscriptExpanded && (normalizedSummary || ("transcript" in episode && episode.transcript)) ? (
          <motion.div
            key="transcript"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="flex flex-col gap-[10px]">
            <div
              className={`overflow-y-auto pl-8 pr-4 py-5 lg:p-[12px] text-[12px] lg:text-[14px] bg-[#1f1f328b] backdrop-blur-3xl text-[var(--audio-sheet-foreground)]/80 transition-all lg:px-10 lg:py-7 ${isTranscriptExpanded ? " max-h-[280px]" : "max-h-[120px]"}`}>
              {normalizedSummary ? (
                <div className="prose prose-invert leading-6 gap-1 text-stone-400 text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizedSummary}</ReactMarkdown>
                </div>
              ) : "transcript" in episode && episode.summary ? (
                <div className="whitespace-pre-wrap px-12">{episode.summary}</div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

type EpisodeHeaderProps = {
  episode: Episode | UserEpisode | null;
  isTranscriptExpanded: boolean;
  onToggleTranscript: () => void;
};

export const EpisodeHeader: FC<EpisodeHeaderProps> = ({ episode, isTranscriptExpanded, onToggleTranscript }) => {
  if (!episode) return null;

  return (
    <div className="flex items-center justify-center pt-3">
      <button
        type="button"
        onClick={onToggleTranscript}
        className="flex items-center gap-1 text-[13px] text-[var(--audio-sheet-foreground)]/90 hover:text-[var(--audio-sheet-foreground)] transition-colors border border-[var(--audio-sheet-border)] rounded-md px-3 py-1 bg-[#7b6bc14f]">
        {isTranscriptExpanded ? "Hide summary" : "Show summary"}
        {isTranscriptExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
    </div>
  );
};

type EpisodeTitleProps = {
  episode: Episode | UserEpisode | null;
};

export const EpisodeTitle: FC<EpisodeTitleProps> = ({ episode }) => {
  if (!episode) return null;

  const title =
    "title" in episode
      ? episode.title
      : (() => {
        const epTitle = episode.episode_title;
        // For news episodes, append the formatted date
        if (episode.youtube_url === "news" && episode.created_at) {
          const date = new Date(episode.created_at);
          const formattedDate = date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          return `${epTitle} - ${formattedDate}`;
        }
        return epTitle;
      })();

  return <h2 className="line-clamp-2 text-[18.64px] font-bold leading-[1.5] tracking-[0.009375em] text-slate-300 text-center px-6 mt-4 text-shadow-lg text-shadow-black/10 capitalize">{title}</h2>;
};

type EpisodeSubtitleProps = {
  episode: Episode | UserEpisode | null;
  podcastName?: string;
  youtubeChannelName?: string;
  isChannelLoading?: boolean;
};

export const EpisodeSubtitle: FC<EpisodeSubtitleProps> = ({ episode, podcastName, youtubeChannelName, isChannelLoading }) => {
  if (!episode) return null;

  const subtitle = getEpisodeSubtitle(episode, { podcastName, youtubeChannelName, isChannelLoading });

  return <p className="text-[13.69px] font-black leading-[1.72857] mt-1 tracking-[0.05142em] uppercase text-[#a484da] text-center text-shadow-md text-shadow-black/20">{subtitle}</p>;
};
