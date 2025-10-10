"use client";
import { Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { FC } from "react";

type TransportProps = {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onSeek: (time: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
};

export const Transport: FC<TransportProps> = ({ isPlaying, isLoading, currentTime, duration, onToggle, onSeek, volume, isMuted, onVolumeChange, onToggleMute }) => {
  const progressPercent = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
  const volumePercent = Math.round((isMuted ? 0 : volume) * 100);
  const formattedCurrent = formatTime(currentTime);
  const formattedDuration = formatTime(duration);

  const handleProgressClick = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * (duration || 0);
    onSeek(newTime);
  };

  const handleVolumeClick = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onVolumeChange(ratio);
  };

  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!duration) return;
    const step = 5; // seconds
    let newTime = currentTime;
    switch (e.key) {
      case "ArrowRight":
        newTime = Math.min(duration, currentTime + step);
        break;
      case "ArrowLeft":
        newTime = Math.max(0, currentTime - step);
        break;
      case "Home":
        newTime = 0;
        break;
      case "End":
        newTime = duration;
        break;
      default:
        return; // ignore other keys
    }
    e.preventDefault();
    onSeek(newTime);
  };

  const handleVolumeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 0.05;
    let next = isMuted ? 0 : volume;
    switch (e.key) {
      case "ArrowRight":
        next = Math.min(1, next + step);
        break;
      case "ArrowLeft":
        next = Math.max(0, next - step);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    onVolumeChange(next);
  };

  return (
    <div className="backdrop-blur-xl bg-[radial-gradient(circle_at_30%_18%,#4a2594ad_10%,#1d1927ad_100%)] w-full h-full flex p-8 flex-col my-0 gap-4 border-t-2 border-t-[#1d1927ad]">
      {/* Controls */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          aria-label={isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
          aria-pressed={isPlaying}
          onClick={onToggle}
          disabled={isLoading}
          className={`inline-flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[var(--audio-sheet-border)] text-sm font-semibold shadow-sm shadow-black/30 transition-all hover:brightness-110 active:translate-y-[2px] disabled:opacity-90 disabled:cursor-not-allowed border-none ${isPlaying ? "bg-[radial-gradient(circle_at_30%_18%,#4c75d6f8_0%,#320576f1_100%)]" : "bg-[radial-gradient(circle_at_30%_18%,#19f8cfc0_0%,#283152ef_100%)]"
            }`}>
          {isLoading ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" color="#1ef5bf80" />
          ) : isPlaying ? (
            <Pause className="h-[18px] w-[18px]" />
          ) : (
            <Play color="#0EF8F4DF" className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-[16px]">
        <span className="w-[27.2px] text-center text-[10px] tabular-nums opacity-90" aria-live="polite">
          {formattedCurrent}
        </span>
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration || 0)}
          aria-valuenow={Math.floor(currentTime || 0)}
          tabIndex={0}
          onClick={e => handleProgressClick(e.clientX, e.currentTarget)}
          onKeyDown={handleProgressKeyDown}
          className="group relative h-[7px] w-full outline outline-[#ffffff1e] rounded-[11px] bg-[#282738] transition-colors">
          <div
            className="absolute inset-y-0 left-0 rounded-[11px] transition-all"
            style={{
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, rgb(142 70 235) 0%, rgba(10 107 187 / 0.81) 70%, #08C5B2 100%)",
            }}
          />
        </div>
        <span className="w-[32px] text-center text-[10px] tabular-nums opacity-70">{formattedDuration}</span>
      </div>

      {/* Volume */}
      <div className="audio-player flex items-center justify-center gap-[12px]">
        <button
          type="button"
          aria-label={isMuted ? "Unmute" : "Mute"}
          aria-pressed={isMuted}
          onClick={onToggleMute}
          className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-[8px] border border-[var(--audio-sheet-border)] bg-transparent text-xs transition-colors hover:bg-[var(--audio-sheet-border)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--audio-sheet-accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--audio-sheet-bg)]">
          {isMuted ? <VolumeX className="h-[16px] w-[16px]" /> : <Volume2 className="h-[16px] w-[16px]" />}
        </button>
        <div
          role="slider"
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={volumePercent}
          tabIndex={0}
          onClick={e => handleVolumeClick(e.clientX, e.currentTarget)}
          onKeyDown={handleVolumeKeyDown}
          className="group relative h-[5px] w-[160px] rounded-[11px] bg-[var(--audio-sheet-border)]/40 transition-colors hover:bg-[var(--audio-sheet-border)]/30">
          <div
            className="absolute inset-y-[-1px] left-0 rounded-[11px] linear-gradient(90deg, rgb(142 70 235) 0%, rgba(10 107 187 / 0.81) 70%, #08C5B2 100%) transition-all"
            style={{
              background: "linear-gradient(90deg, rgba(56 45 210 / 0.81) 30%, #8F67E5 120%)",
              width: `${volumePercent}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}
