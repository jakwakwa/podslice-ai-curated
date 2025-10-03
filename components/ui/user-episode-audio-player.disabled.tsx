"use client";
import { X } from "lucide-react";
import type React from "react";
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import styles from "@/components/ui/audio-player.module.css";
import type { UserEpisode } from "@/lib/types";
import { Button } from "./button";
import { Typography } from "./typography";

export const truncateTitle = (title: string, maxLength: number): string => {
	if (title.length > maxLength) {
		return `${title.substring(0, maxLength)}...`;
	}
	return title;
};

export const formatDate = (epochTime: string): string => {
	const date = new Date(Number.parseInt(epochTime) * 1000);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

export const formatTime = (time: number): string => {
	if (Number.isNaN(time) || time === Number.POSITIVE_INFINITY) return "0:00";
	const minutes = Math.floor(time / 60);
	const seconds = Math.floor(time % 60);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const truncateDescription = (description: string | null, maxLength: number): string => {
	if (!description) return "";
	if (description.length > maxLength) {
		return `${description.substring(0, maxLength)}...`;
	}
	return description;
};

interface UserEpisodeAudioPlayerProps {
	episode: UserEpisode;
	ref?: JSX.ElementType;
	onClose?: () => void;
}

export default function UserEpisodeAudioPlayer({ episode, onClose }: UserEpisodeAudioPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);

	const audioRef = useRef<HTMLAudioElement | null>(null);

	const onAudioEnd = useCallback(() => {
		setIsPlaying(false);
		setProgress(0);
		setCurrentTime(0);
	}, []);

	const updateProgress = useCallback(() => {
		if (audioRef.current) {
			const current = audioRef.current.currentTime;
			const total = audioRef.current.duration;
			setCurrentTime(current);
			if (total) {
				setProgress((current / total) * 100);
			}
		}
	}, []);

	const onLoadedMetadata = useCallback(() => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration);
		}
	}, []);

	const onAudioError = useCallback(() => {
		toast(`Audio failed to load:${episode.gcs_audio_url}`);
		setIsPlaying(false);
	}, [episode.gcs_audio_url]);

	// Memoized expensive calculations
	const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime]);
	const _formattedDuration = useMemo(() => formatTime(duration), [duration]);
	const _truncatedDescription = useMemo(() => truncateDescription(episode.summary, 100), [episode.summary]);

	const audioSource = useMemo(() => {
		return episode.gcs_audio_url !== "sample-for-simulated-tests.mp3" ? episode.gcs_audio_url : "/sample-for-simulated-tests.mp3";
	}, [episode.gcs_audio_url]);

	const volumeIcon = useMemo(() => {
		if (isMuted || volume === 0) {
			return (
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
					<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
				</svg>
			);
		}
		if (volume < 0.5) {
			return (
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
					<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
				</svg>
			);
		}
		return (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
				<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
			</svg>
		);
	}, [isMuted, volume]);

	useEffect(() => {
		const audio = audioRef.current;

		if (audio) {
			audio.removeEventListener("timeupdate", updateProgress);
			audio.removeEventListener("ended", onAudioEnd);
			audio.removeEventListener("loadedmetadata", onLoadedMetadata);
			audio.removeEventListener("error", onAudioError);
		}

		if (episode.gcs_audio_url && audio) {
			audio.src = audioSource!;
			audio.volume = volume;
			audio.addEventListener("timeupdate", updateProgress);
			audio.addEventListener("ended", onAudioEnd);
			audio.addEventListener("loadedmetadata", onLoadedMetadata);
			audio.addEventListener("error", onAudioError);

			if (isPlaying) {
				audio.play().catch(e => console.error("Error playing audio on episode change:", e));
			} else {
				audio.load();
				audio.pause();
			}
		} else if (audio) {
			audio.pause();
			audio.src = "";
			setIsPlaying(false);
			setProgress(0);
			setCurrentTime(0);
			setDuration(0);
		}

		return () => {
			if (audio) {
				audio.removeEventListener("timeupdate", updateProgress);
				audio.removeEventListener("ended", onAudioEnd);
				audio.removeEventListener("loadedmetadata", onLoadedMetadata);
				audio.removeEventListener("error", onAudioError);
			}
		};
	}, [episode, isPlaying, onAudioEnd, audioSource, onAudioError, updateProgress, onLoadedMetadata, volume]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = isMuted ? 0 : volume;
		}
	}, [volume, isMuted]);

	const togglePlayPause = async () => {
		if (audioRef.current) {
			try {
				if (isPlaying) {
					audioRef.current.pause();
					setIsPlaying(false);
				} else {
					// Check if audio is paused before playing to prevent AbortError
					if (audioRef.current.paused) {
						await audioRef.current.play();
						setIsPlaying(true);
					}
				}
			} catch (error) {
				console.error("Audio Player Error:", error);
				toast(`Audio Player Error: ${error}`);
				setIsPlaying(false);
			}
		}
	};

	const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
		if (audioRef.current && duration) {
			const rect = e.currentTarget.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const width = rect.width;
			const newTime = (clickX / width) * duration;
			audioRef.current.currentTime = newTime;
			setCurrentTime(newTime);
			setProgress((newTime / duration) * 100);
		}
	};

	const toggleMute = () => {
		setIsMuted(!isMuted);
	};

	const _changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = Number.parseFloat(e.target.value);
		setVolume(newVolume);
		setIsMuted(newVolume === 0);
	};

	const handleClose = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		setIsPlaying(false);
		setProgress(0);
		setCurrentTime(0);
		onClose?.();
	};

	return (
		<div className={styles.userAudioPlayer}>
			<div className="gap-4 flex flex-row items-center justify-start px-2 m-0 episode-info">
				<div className="h-fit flex items-center justify-center episode-info info ">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
					</svg>
				</div>
				<Typography className="text-xs w-full min-w-[1	00px] truncate max-w-[100px] md:max-w-none">{episode.episode_title}</Typography>
			</div>

			<div className={styles.controls}>
				<Button onClick={togglePlayPause} className={styles.playPauseButton} size={"sm"} variant="default">
					{isPlaying ? (
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
						</svg>
					) : (
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z" />
						</svg>
					)}
				</Button>

				<div className="w-full flex items-c gap-4 min-w-24 time-display">
					<span className=" time-display text-xs mx-2 w-[20px]">{formattedCurrentTime}</span>
					<div className={styles.progressBar} onClick={seekTo} role="slider" tabIndex={0} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Seek through audio">
						<div className={styles.progress} style={{ width: `${progress}%` }} />
					</div>
					{/* <span className={styles.timeDisplay}>{formattedDuration}</span> */}
				</div>
				{onClose && (
					<div className="flex flex-row">
						<Button onClick={handleClose} size="xs" variant="outline">
							<X />
						</Button>
					</div>
				)}
				<div className="hidden lg:flex lg:flex-row  ">
					<Button onClick={toggleMute} size="xs" variant="outline" className="hidden lg:flex lg:flex-row ">
						{volumeIcon}
					</Button>
				</div>
			</div>

			<audio ref={audioRef} src={episode.gcs_audio_url!}>
				<track
					kind="captions"
					src={
						episode.summary
							? `data:text/vtt;base64,${btoa(unescape(encodeURIComponent(`WEBVTT\n\n00:00:00.000 --> 99:59:59.999\n${episode.summary}`)))}`
							: "data:text/vtt;base64,V0VCVlRUCgowMDowMDowMC4wMDAgLS0+IDAwOjAwOjAwLjAwMAo="
					}
					srcLang="en"
					label={episode.summary ? "Episode transcript" : "No captions available"}
					default
				/>
			</audio>
		</div>
	);
}
