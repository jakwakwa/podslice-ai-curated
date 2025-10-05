"use client";

import { ChevronDown, ChevronUp, Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import Image from "next/image";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatTime } from "@/components/ui/audio-player.disabled";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useYouTubeChannel } from "@/hooks/useYouTubeChannel";
import { normalizeSummaryMarkdown } from "@/lib/markdown/episode-text";
import type { Episode, UserEpisode } from "@/lib/types";

type AudioPlayerSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	episode: Episode | UserEpisode | null;
	onClose?: () => void;
};

export const AudioPlayerSheet: FC<AudioPlayerSheetProps> = ({ open, onOpenChange, episode }) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const lastEpisodeKeyRef = useRef<string | null>(null);
	const [_currentTime, setCurrentTime] = useState(0);
	const [_duration, setDuration] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
	const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const pendingPlayRef = useRef(false);
	const canPlayDebounceRef = useRef<NodeJS.Timeout | null>(null);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Get YouTube channel name and image for user episodes
	const youtubeUrl = episode && "youtube_url" in episode ? episode.youtube_url : null;
	const { channelName: youtubeChannelName, channelImage: youtubeChannelImage, isLoading: isChannelLoading } = useYouTubeChannel(youtubeUrl);

	const rawSummaryOrDescription = useMemo(() => {
		if (!episode) return null;
		if ("summary" in episode && episode.summary) return episode.summary as string;
		if ("description" in episode && episode.description) return episode.description as string;
		return null;
	}, [episode]);

	const normalizedSummary = useMemo(() => (rawSummaryOrDescription ? normalizeSummaryMarkdown(rawSummaryOrDescription) : null), [rawSummaryOrDescription]);

	const clearCanPlayDebounce = useCallback(() => {
		if (canPlayDebounceRef.current) {
			clearTimeout(canPlayDebounceRef.current);
			canPlayDebounceRef.current = null;
		}
	}, []);

	const startProgressInterval = useCallback(() => {
		if (progressIntervalRef.current) return;
		progressIntervalRef.current = setInterval(() => {
			const audio = audioRef.current;
			if (!audio) return;
			const current = audio.currentTime || 0;
			setCurrentTime(current);
			const total = audio.duration;
			if (!Number.isNaN(total) && total !== Number.POSITIVE_INFINITY && total > 0) {
				setDuration(total);
			}
		}, 250);
	}, []);

	const stopProgressInterval = useCallback(() => {
		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}
	}, []);

	const clearLoadingTimeout = useCallback(() => {
		if (loadingTimeoutRef.current) {
			clearTimeout(loadingTimeoutRef.current);
			loadingTimeoutRef.current = null;
		}
	}, []);

	const setLoadingWithTimeout = useCallback(
		(loading: boolean) => {
			clearLoadingTimeout();
			setIsLoading(loading);

			if (loading) {
				// Set a 5-second timeout to clear loading state as fallback
				loadingTimeoutRef.current = setTimeout(() => {
					console.log("AudioPlayerSheet - Loading timeout, clearing loading state");
					setIsLoading(false);
					loadingTimeoutRef.current = null;
				}, 5000);
			}
		},
		[clearLoadingTimeout]
	);

	// Clean up timeout on unmount
	useEffect(() => {
		return () => clearLoadingTimeout();
	}, [clearLoadingTimeout]);

	const audioSrc = useMemo(() => {
		if (!(open && episode)) return "";
		const raw = "audio_url" in episode && episode.audio_url ? episode.audio_url : "gcs_audio_url" in episode && episode.gcs_audio_url ? episode.gcs_audio_url : "";
		return raw;
	}, [open, episode]);

	// Resolve signed URL for catalog episodes when needed
	const [resolvedSrc, setResolvedSrc] = useState<string>("");
	useEffect(() => {
		let aborted = false;
		async function resolve() {
			if (!(open && episode)) {
				setResolvedSrc("");
				return;
			}
			// User episodes carry a signed URL in gcs_audio_url already
			if ("gcs_audio_url" in (episode as Record<string, unknown>) && (episode as { gcs_audio_url?: string | null }).gcs_audio_url) {
				setResolvedSrc((episode as { gcs_audio_url: string }).gcs_audio_url);
				return;
			}
			
			// Check if audio_url is a play endpoint that needs resolution
			const isPlayEndpoint = audioSrc.startsWith('/api/episodes/') || audioSrc.startsWith('/api/user-episodes/');
			
			if (isPlayEndpoint) {
				// Fetch signed URL from play endpoint
				try {
					const res = await fetch(audioSrc, { cache: "no-store" });
					if (!res.ok) {
						console.error('Failed to fetch signed URL from play endpoint:', audioSrc);
						setResolvedSrc("");
						return;
					}
					const data = (await res.json()) as { signedUrl?: string };
					if (!aborted) setResolvedSrc(data.signedUrl || "");
				} catch (err) {
					console.error('Error fetching signed URL:', err);
					if (!aborted) setResolvedSrc("");
				}
			} else {
				// Direct URL (already signed or public)
				setResolvedSrc(audioSrc);
			}
		}
		void resolve();
		return () => {
			aborted = true;
		};
	}, [open, episode, audioSrc]);

	const episodeKey = useMemo(() => {
		if (!episode) return null;
		// Prefer explicit ids where available, fallback to a stable title-based key
		const maybeId = (episode as unknown as { episode_id?: string; id?: string }).episode_id || (episode as unknown as { id?: string }).id;
		if (maybeId) return String(maybeId);
		if ("title" in (episode as Record<string, unknown>) && (episode as Record<string, unknown>).title) return String((episode as { title: string }).title);
		if ("episode_title" in (episode as Record<string, unknown>) && (episode as Record<string, unknown>).episode_title) return String((episode as { episode_title: string }).episode_title);
		return null;
	}, [episode]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const resolveDuration = (): number | null => {
			const d = audio.duration;
			if (!Number.isNaN(d) && d !== Number.POSITIVE_INFINITY && d > 0) return d;
			try {
				if (audio.seekable && audio.seekable.length > 0) {
					const end = audio.seekable.end(audio.seekable.length - 1);
					if (end > 0) return end;
				}
			} catch { }
			return null;
		};

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime || 0);
			const maybe = resolveDuration();
			if (maybe) setDuration(maybe);
		};
		const handleLoadedMetadata = () => {
			console.log("AudioPlayerSheet - Audio loaded metadata, duration:", audio.duration);
			const maybe = resolveDuration();
			if (maybe !== null) setDuration(maybe);
			// Ensure we always start from 0 on new loads
			try {
				if (audio.currentTime > 0) {
					audio.currentTime = 0;
				}
				setCurrentTime(0);
			} catch { }
			// Keep loading until actual playback starts
		};
		const handleDurationChange = () => {
			const maybe = resolveDuration();
			if (maybe) setDuration(maybe);
		};
		const handleLoadedData = () => {
			const maybe = resolveDuration();
			if (maybe) setDuration(maybe);
		};
		const handleCanPlayThrough = () => {
			console.log("AudioPlayerSheet - canplaythrough");
			const maybe = resolveDuration();
			if (maybe) setDuration(maybe);
			clearLoadingTimeout();
			setIsLoading(false);
		};
		const handleEnded = () => {
			console.log("AudioPlayerSheet - Audio playback ended");
			setIsPlaying(false);
			setCurrentTime(0);
			pendingPlayRef.current = false;
			clearLoadingTimeout();
			setIsLoading(false);
			stopProgressInterval();
		};
		const handleError = (e: Event) => {
			console.error("AudioPlayerSheet - Audio error event:", e, { audioSrc });
			pendingPlayRef.current = false;
			clearLoadingTimeout();
			setIsLoading(false);
			setIsPlaying(false);
			stopProgressInterval();
		};
		const handleEmptied = () => {
			console.log("AudioPlayerSheet - Audio emptied");
			setIsPlaying(false);
			setCurrentTime(0);
			setDuration(0);
			pendingPlayRef.current = false;
			stopProgressInterval();
		};
		const handleStalled = () => {
			console.log("AudioPlayerSheet - Audio stalled");
			setLoadingWithTimeout(true);
		};
		const handleCanPlay = () => {
			console.log("AudioPlayerSheet - Audio can play, readyState:", audio.readyState);
			// If a play was requested while not ready, try again now
			if (pendingPlayRef.current && audio.paused) {
				void audio.play().catch(err => {
					console.error("AudioPlayerSheet - play() retry on canplay failed:", err);
					pendingPlayRef.current = false;
					clearLoadingTimeout();
					setIsLoading(false);
				});
			}
			// Debounce clearing loading on canplay to avoid flicker for signed URLs
			clearCanPlayDebounce();
			canPlayDebounceRef.current = setTimeout(() => {
				// If we still aren't playing after a short grace period, clear loading
				if (!audio.paused || audio.readyState >= 3) {
					clearLoadingTimeout();
					setIsLoading(false);
				}
				canPlayDebounceRef.current = null;
			}, 250);
		};
		const handleLoadStart = () => {
			console.log("AudioPlayerSheet - Audio load started");
			clearCanPlayDebounce();
			setLoadingWithTimeout(true);
		};
		const handlePlay = () => {
			console.log("AudioPlayerSheet - Audio play event");
			pendingPlayRef.current = false;
			setIsPlaying(true);
			clearLoadingTimeout();
			setIsLoading(false);
			clearCanPlayDebounce();
			startProgressInterval();
		};
		const handlePlaying = () => {
			console.log("AudioPlayerSheet - Audio playing event");
			pendingPlayRef.current = false;
			setIsPlaying(true);
			clearLoadingTimeout();
			setIsLoading(false);
			clearCanPlayDebounce();
			startProgressInterval();
		};
		const handlePause = () => {
			console.log("AudioPlayerSheet - Audio pause event");
			setIsPlaying(false);
			clearCanPlayDebounce();
			stopProgressInterval();
		};
		const handleSeeking = () => {
			console.log("AudioPlayerSheet - Audio seeking");
			clearCanPlayDebounce();
			setLoadingWithTimeout(true);
		};
		const handleSeeked = () => {
			console.log("AudioPlayerSheet - Audio seeked");
			if (!audio.paused) {
				clearLoadingTimeout();
				setIsLoading(false);
			}
			clearCanPlayDebounce();
		};

		// Add event listeners once per mount of this effect
		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("durationchange", handleDurationChange);
		audio.addEventListener("loadeddata", handleLoadedData);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);
		audio.addEventListener("canplay", handleCanPlay);
		audio.addEventListener("loadstart", handleLoadStart);
		audio.addEventListener("canplaythrough", handleCanPlayThrough);
		audio.addEventListener("play", handlePlay);
		audio.addEventListener("playing", handlePlaying);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("waiting", handleLoadStart);
		audio.addEventListener("seeking", handleSeeking);
		audio.addEventListener("seeked", handleSeeked);
		audio.addEventListener("emptied", handleEmptied);
		audio.addEventListener("stalled", handleStalled);

		if (open && resolvedSrc) {
			const hasEpisodeChanged = episodeKey && lastEpisodeKeyRef.current !== episodeKey;
			if (audio.src !== resolvedSrc || hasEpisodeChanged) {
				// Reset UI and timers for new source
				stopProgressInterval();
				setCurrentTime(0);
				setDuration(0);
				// Apply new source
				try {
					// Always pause before switching source to clear previous playback state
					audio.pause();
				} catch { }
				// Force reload even when src strings might match (e.g., signed urls reused)
				if (hasEpisodeChanged) {
					try {
						audio.removeAttribute("src");
					} catch { }
				}
				audio.src = resolvedSrc;
				lastEpisodeKeyRef.current = episodeKey;
			}
			// Ensure the element preloads metadata for snappier start
			audio.preload = "metadata";
			// Reset loading state when setting up new audio
			pendingPlayRef.current = false;
			clearLoadingTimeout();
			setIsLoading(false);
			// Safe to load metadata now (no user-initiated play yet on new source)
			try {
				audio.currentTime = 0;
				audio.load();
			} catch { }
		} else if (!(open || audio.paused)) {
			audio.pause();
			pendingPlayRef.current = false;
			setIsPlaying(false);
			clearLoadingTimeout();
			setIsLoading(false);
			stopProgressInterval();
		}

		return () => {
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("durationchange", handleDurationChange);
			audio.removeEventListener("loadeddata", handleLoadedData);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
			audio.removeEventListener("canplay", handleCanPlay);
			audio.removeEventListener("loadstart", handleLoadStart);
			audio.removeEventListener("canplaythrough", handleCanPlayThrough);
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("playing", handlePlaying);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("waiting", handleLoadStart);
			audio.removeEventListener("seeking", handleSeeking);
			audio.removeEventListener("seeked", handleSeeked);
			audio.removeEventListener("emptied", handleEmptied);
			audio.removeEventListener("stalled", handleStalled);
			clearCanPlayDebounce();
			stopProgressInterval();
		};
	}, [open, resolvedSrc, clearLoadingTimeout, setLoadingWithTimeout, clearCanPlayDebounce, startProgressInterval, stopProgressInterval, audioSrc, episodeKey]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume));
		}
	}, [volume, isMuted]);

	const togglePlayPause = async () => {
		const audio = audioRef.current;
		if (!(audio && resolvedSrc)) {
			console.warn("AudioPlayerSheet - togglePlayPause: Missing audio element or resolvedSrc", { audio: !!audio, resolvedSrc });
			return;
		}

		console.log("AudioPlayerSheet - togglePlayPause:", { isPlaying, resolvedSrc, readyState: audio.readyState, paused: audio.paused });

		try {
			const isActuallyPaused = audio.paused;
			if (!isActuallyPaused) {
				console.log("AudioPlayerSheet - Pausing audio");
				audio.pause();
				setIsPlaying(false);
				pendingPlayRef.current = false;
				clearLoadingTimeout();
				setIsLoading(false);
			} else {
				// Ensure source is applied immediately on first interaction
				if (audio.src !== resolvedSrc) {
					console.log("AudioPlayerSheet - Applying src before play:", resolvedSrc);
					audio.src = resolvedSrc;
				}
				// If media is not ready, show loading and mark a pending play intent
				if (audio.readyState < 2) {
					console.log("AudioPlayerSheet - Audio not ready, showing loading state");
					setLoadingWithTimeout(true);
				}
				pendingPlayRef.current = true;
				if (audio.paused) {
					console.log("AudioPlayerSheet - Playing audio (audio was paused)");
					// Proactively start progress interval in case listeners aren't attached yet
					startProgressInterval();
					const playPromise = audio.play();
					if (playPromise && typeof (playPromise as Promise<void>).then === "function") {
						playPromise
							.then(() => {
								console.log("AudioPlayerSheet - play() promise resolved");
								// Ensure UI is responsive even if 'playing' event is delayed
								pendingPlayRef.current = false;
								setIsPlaying(true);
								clearLoadingTimeout();
								setIsLoading(false);
								startProgressInterval();
							})
							.catch((err: unknown) => {
								console.error("AudioPlayerSheet - Audio play() failed:", err);
								pendingPlayRef.current = false;
								setIsPlaying(false);
								clearLoadingTimeout();
								setIsLoading(false);
							});
					}
				} else {
					console.log("AudioPlayerSheet - Audio not paused, setting playing intent");
					// If already playing but state out of sync, rely on 'playing' event to correct
					pendingPlayRef.current = true;
				}
			}
		} catch (error) {
			console.error("AudioPlayerSheet - Audio Player Error:", error);
			setIsPlaying(false);
			pendingPlayRef.current = false;
			clearLoadingTimeout();
			setIsLoading(false);

			// Try to reload if play failed (fallback)
			if (!isPlaying) {
				console.log("AudioPlayerSheet - Reloading audio after play failure");
				setLoadingWithTimeout(true);
				audio.load();
			}
		}
	};

	const progressPercent = useMemo(() => {
		return _duration > 0 ? Math.max(0, Math.min(100, (_currentTime / _duration) * 100)) : 0;
	}, [_currentTime, _duration]);

	const formattedCurrent = useMemo(() => formatTime(_currentTime), [_currentTime]);
	const formattedDuration = useMemo(() => formatTime(_duration), [_duration]);

	const seekToClientX = (clientX: number, target: HTMLDivElement) => {
		const rect = target.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const newTime = ratio * (_duration || 0);
		if (audioRef.current && _duration) {
			audioRef.current.currentTime = newTime;
			setCurrentTime(newTime);
		}
	};

	const handleProgressClick: React.MouseEventHandler<HTMLDivElement> = e => {
		if (!_duration) return;
		seekToClientX(e.clientX, e.currentTarget);
	};

	const handleProgressKeyDown: React.KeyboardEventHandler<HTMLDivElement> = e => {
		if (!(_duration && audioRef.current)) return;
		const step = 5; // seconds
		let newTime = _currentTime;
		switch (e.key) {
			case "ArrowRight":
				newTime = Math.min(_duration, _currentTime + step);
				break;
			case "ArrowLeft":
				newTime = Math.max(0, _currentTime - step);
				break;
			case "Home":
				newTime = 0;
				break;
			case "End":
				newTime = _duration;
				break;
			default:
				return; // ignore other keys
		}
		e.preventDefault();
		audioRef.current.currentTime = newTime;
		setCurrentTime(newTime);
	};

	// Volume interactions
	const volumePercent = Math.round((isMuted ? 0 : volume) * 100);

	const setVolumeFromClientX = (clientX: number, target: HTMLDivElement) => {
		const rect = target.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		setIsMuted(ratio === 0);
		setVolume(ratio);
	};

	const handleVolumeClick: React.MouseEventHandler<HTMLDivElement> = e => {
		setVolumeFromClientX(e.clientX, e.currentTarget);
	};

	const handleVolumeKeyDown: React.KeyboardEventHandler<HTMLDivElement> = e => {
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
		setIsMuted(next === 0);
		setVolume(next);
	};

	const toggleMute = () => {
		setIsMuted(m => !m);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="p-0 text-[var(--audio-sheet-foreground)] w-full sm:w-[430px] md:min-w-[500px] gap-0 border-l-1 border-l-[#9ecaf53d]">
				{/* Sections */}

				{/* Hero Section starts */}
				<div className="items-center flex-col align-middle h-full max-h-[600px] justify-center content-center backdrop-blur-2xl bg-[#2780f513] p-6 pt-8 gap-4">
					{/* Artwork + Meta */}

					{episode &&
						(() => {
							// For bundle episodes, use the episode's image_url
							if ("image_url" in episode && episode.image_url) {
								return (
									<div className="aspect-[16/9] shadow-black/40 shadow-xl h-auto w-full shrink-0 rounded-4xl mx-auto max-w-[200px] border-4 border-[#9ecaf5f] overflow-hidden flex justify-center items-center">
										<div className="overflow-hidden h-auto w-full shrink-0 mx-auto aspect-[16/12]">
											<Image src={episode.image_url} alt={episode.title} width={200} height={100} className="outline-2 outline-[#9ecaf53d]  shadow-black shadow-xl object-cover" />
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
						})()}

					<SheetHeader>
						<SheetTitle className="line-clamp-2 text-[16.64px] font-bold leading-[1.5] tracking-[0.009375em] text-slate-300 text-center px-6 mt-4  text-shadow-lg text-shadow-black/10">
							{episode ? ("title" in episode ? episode.title : episode.episode_title) : "Episode title"}
						</SheetTitle>
						<SheetDescription className=" text-[16.69px] font-black leading-[1.72857] mt-1 tracking-[0.05142em] uppercase text-[#a484da] text-center text-shadow-md text-shadow-black/20">
							{episode
								? "title" in episode
									? (() => {
										const e = episode as unknown as { podcast?: { name?: string } };
										return e.podcast?.name || "Podcast episode";
									})()
									: (() => {
										// For user episodes, show YouTube channel name or fallback
										if (isChannelLoading) {
											return "Loading...";
										}
										return youtubeChannelName || "User Generated Episode";
									})()
								: "Podcast source"}
						</SheetDescription>
						<div className="flex items-center justify-center pt-3">
							<button
								type="button"
								onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
								className="flex items-center gap-1 text-[13px] text-[var(--audio-sheet-foreground)]/90 hover:text-[var(--audio-sheet-foreground)] transition-colors border border-[var(--audio-sheet-border)] rounded-md px-3 py-1 bg-[#7b6bc14f]">
								{isTranscriptExpanded ? "Hide summary" : "Show summary"}
								{isTranscriptExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
							</button>
						</div>
					</SheetHeader>
				</div>
				{/* Hero Section ends */}

				<div className="bg-[#413e3e15] backdrop-blur-md rounded-none">
					{/* Transcript */}
					<AnimatePresence initial={false}>
						{episode && isTranscriptExpanded && (normalizedSummary || ("transcript" in episode && episode.transcript)) ? (
							<motion.div
								key="transcript"
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ type: "spring", stiffness: 260, damping: 30 }}
								className="flex flex-col gap-[10px]">
								<div
									className={`overflow-y-auto pl-8 pr-4 py-5 lg:p-[12px] text-[12px] lg:text-[14px] bg-[#101515d9] backdrop-blur-3xl text-[var(--audio-sheet-foreground)]/80 transition-all lg:px-10 lg:py-7 ${isTranscriptExpanded ? " max-h-[280px]" : "max-h-[120px]"}`}>
									{normalizedSummary ? (
										<div className="prose prose-invert leading-6 gap-1 text-slate-400 text-sm">
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

				<div className=" backdrop-blur-xl  bg-[#070e0d8d] w-full h-full flex p-8 flex-col my-0 gap-4 border-t-2 border-t-[#171d1e51]">
					{/* Controls */}
					<div className="flex items-center justify-center">
						<button
							type="button"
							aria-label={isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
							aria-pressed={isPlaying}
							onClick={togglePlayPause}
							disabled={!resolvedSrc || isLoading}
							className={`inline-flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[var(--audio-sheet-border)] text-sm font-semibold shadow-sm  shadow-black/30 transition-all hover:brightness-110 active:translate-y-[2px]  disabled:opacity-90 disabled:cursor-not-allowed border-none ${isPlaying ? "bg-[radial-gradient(circle_at_30%_18%,#4c75d6f8_0%,#320576f1_100%)]" : "bg-[radial-gradient(circle_at_30%_18%,#19f8cfc0_0%,#283152ef_100%)] "}`}>
							{isLoading ? <Loader2 className="h-[18px] w-[18px] animate-spin" color="#1ef5bf80" /> : isPlaying ? <Pause className="h-[18px] w-[18px]" /> : <Play color={"#0EF8F4DF"} className="h-[18px] w-[18px]" />}
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
							aria-valuemax={Math.floor(_duration || 0)}
							aria-valuenow={Math.floor(_currentTime || 0)}
							tabIndex={0}
							onClick={handleProgressClick}
							onKeyDown={handleProgressKeyDown}
							className="group relative h-[7px] w-full outline outline-[#ffffff1e] rounded-[11px] bg-[#282738] transition-colors">
							<div
								className="absolute inset-y-0 left-0 rounded-[11px] transition-all"
								style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, rgb(142 70 235) 0%, rgba(10 107 187 / 0.81) 70%, #08C5B2 100%)" }}
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
							onClick={toggleMute}
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
							onClick={handleVolumeClick}
							onKeyDown={handleVolumeKeyDown}
							className="group relative h-[5px] w-[160px] rounded-[11px] bg-[var(--audio-sheet-border)]/40 transition-colors hover:bg-[var(--audio-sheet-border)]/30">
							<div className="absolute inset-y-[-1px] left-0 rounded-[11px] linear-gradient(90deg, rgb(142 70 235) 0%, rgba(10 107 187 / 0.81) 70%, #08C5B2 100%) transition-all" style={{ background: "linear-gradient(90deg, rgba(56 45 210 / 0.81) 30%, #8F67E5 120%)", width: `${volumePercent}%` }} />
						</div>
					</div>
				</div>
				{/* Hidden audio element */}
				<audio ref={audioRef} className="hidden">
					<track kind="captions" />
				</audio>
			</SheetContent>
		</Sheet>
	);
};
