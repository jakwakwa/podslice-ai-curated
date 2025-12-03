import type { RefObject } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

// Simple debug logger for audio player - only logs in development
const debugLog = (message: string, ...args: unknown[]) => {
	if (process.env.NODE_ENV === "development") {
		console.log(`[AudioPlayer] ${message}`, ...args);
	}
};

type State = {
	isPlaying: boolean;
	isLoading: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isMuted: boolean;
};

type Action =
	| { type: "play" }
	| { type: "pause" }
	| { type: "loading"; value: boolean }
	| { type: "time"; currentTime: number }
	| { type: "duration"; duration: number }
	| { type: "volume"; volume: number }
	| { type: "mute"; value: boolean };

const initial: State = {
	isPlaying: false,
	isLoading: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	isMuted: false,
};

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "play":
			return { ...state, isPlaying: true, isLoading: false };
		case "pause":
			return { ...state, isPlaying: false };
		case "loading":
			return { ...state, isLoading: action.value };
		case "time":
			return { ...state, currentTime: action.currentTime };
		case "duration":
			return { ...state, duration: action.duration };
		case "volume":
			return { ...state, volume: action.volume, isMuted: action.volume === 0 };
		case "mute":
			return { ...state, isMuted: action.value };
		default:
			return state;
	}
}

export function useAudioController({
	audioRef,
}: {
	audioRef: RefObject<HTMLAudioElement | null>;
}) {
	const [state, dispatch] = useReducer(reducer, initial);
	const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Apply volume changes to audio element
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = state.isMuted
				? 0
				: Math.max(0, Math.min(1, state.volume));
		}
	}, [state.volume, state.isMuted, audioRef]);

	// Clear timers on unmount
	useEffect(() => {
		return () => {
			if (loadingTimeoutRef.current) {
				clearTimeout(loadingTimeoutRef.current);
			}
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
		};
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
			dispatch({ type: "loading", value: loading });

			if (loading) {
				loadingTimeoutRef.current = setTimeout(() => {
					dispatch({ type: "loading", value: false });
					loadingTimeoutRef.current = null;
				}, 5000);
			}
		},
		[clearLoadingTimeout]
	);

	const startProgressInterval = useCallback(() => {
		if (progressIntervalRef.current) return;
		progressIntervalRef.current = setInterval(() => {
			const audio = audioRef.current;
			if (!audio) return;
			const current = audio.currentTime || 0;
			dispatch({ type: "time", currentTime: current });
			const total = audio.duration;
			if (!Number.isNaN(total) && total !== Number.POSITIVE_INFINITY && total > 0) {
				dispatch({ type: "duration", duration: total });
			}
		}, 250);
	}, [audioRef]);

	const stopProgressInterval = useCallback(() => {
		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}
	}, []);

	const play = useCallback(async () => {
		const audio = audioRef.current;
		if (!audio) return;
		dispatch({ type: "loading", value: audio.readyState < 2 });
		try {
			await audio.play();
			dispatch({ type: "play" });
		} catch {
			dispatch({ type: "loading", value: false });
		}
	}, [audioRef]);

	const pause = useCallback(() => {
		audioRef.current?.pause();
		dispatch({ type: "pause" });
	}, [audioRef]);

	const toggle = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		if (audio.paused) {
			void play();
		} else {
			pause();
		}
	}, [play, pause, audioRef]);

	const seek = useCallback(
		(time: number) => {
			const audio = audioRef.current;
			if (!(audio && Number.isFinite(time))) return;
			audio.currentTime = Math.max(0, Math.min(state.duration || 0, time));
			dispatch({ type: "time", currentTime: audio.currentTime });
		},
		[audioRef, state.duration]
	);

	const setVolume = useCallback((volume: number) => {
		dispatch({ type: "volume", volume: Math.max(0, Math.min(1, volume)) });
	}, []);

	const toggleMute = useCallback(() => {
		dispatch({ type: "mute", value: !state.isMuted });
	}, [state.isMuted]);

	// Event handlers for audio element
	const onPlay = useCallback(() => {
		debugLog("Audio play event");
		dispatch({ type: "play" });
		clearLoadingTimeout();
		startProgressInterval();
	}, [clearLoadingTimeout, startProgressInterval]);

	const onPlaying = useCallback(() => {
		dispatch({ type: "play" });
		clearLoadingTimeout();
		startProgressInterval();
	}, [clearLoadingTimeout, startProgressInterval]);

	const onPause = useCallback(() => {
		dispatch({ type: "pause" });
		stopProgressInterval();
	}, [stopProgressInterval]);

	const onTimeUpdate = useCallback(() => {
		const audio = audioRef.current;
		if (audio) {
			dispatch({ type: "time", currentTime: audio.currentTime || 0 });
		}
	}, [audioRef]);

	const onLoadedMetadata = useCallback(() => {
		const audio = audioRef.current;
		debugLog("Audio loaded metadata, duration:", audio?.duration);
		if (audio && Number.isFinite(audio.duration)) {
			dispatch({ type: "duration", duration: audio.duration });
		}
		// Ensure we start from 0 on new loads
		try {
			if (audio && audio.currentTime > 0) {
				audio.currentTime = 0;
			}
			dispatch({ type: "time", currentTime: 0 });
		} catch {}
	}, [audioRef]);

	const onDurationChange = useCallback(() => {
		const audio = audioRef.current;
		if (audio && Number.isFinite(audio.duration)) {
			dispatch({ type: "duration", duration: audio.duration });
		}
	}, [audioRef]);

	const onCanPlay = useCallback(() => {
		const audio = audioRef.current;
		debugLog("Audio can play, readyState:", audio?.readyState);
		clearLoadingTimeout();
		dispatch({ type: "loading", value: false });
	}, [clearLoadingTimeout, audioRef]);

	const onCanPlayThrough = useCallback(() => {
		clearLoadingTimeout();
		dispatch({ type: "loading", value: false });
	}, [clearLoadingTimeout]);

	const onWaiting = useCallback(() => {
		setLoadingWithTimeout(true);
	}, [setLoadingWithTimeout]);

	const onStalled = useCallback(() => {
		setLoadingWithTimeout(true);
	}, [setLoadingWithTimeout]);

	const onSeeking = useCallback(() => {
		setLoadingWithTimeout(true);
	}, [setLoadingWithTimeout]);

	const onSeeked = useCallback(() => {
		if (audioRef.current && !audioRef.current.paused) {
			clearLoadingTimeout();
			dispatch({ type: "loading", value: false });
		}
	}, [audioRef, clearLoadingTimeout]);

	const onEnded = useCallback(() => {
		dispatch({ type: "pause" });
		dispatch({ type: "time", currentTime: 0 });
		stopProgressInterval();
		clearLoadingTimeout();
		dispatch({ type: "loading", value: false });
		seek(0);
	}, [stopProgressInterval, clearLoadingTimeout, seek]);

	const onError = useCallback(() => {
		dispatch({ type: "pause" });
		dispatch({ type: "loading", value: false });
		stopProgressInterval();
		clearLoadingTimeout();
	}, [stopProgressInterval, clearLoadingTimeout]);

	const onEmptied = useCallback(() => {
		dispatch({ type: "pause" });
		dispatch({ type: "time", currentTime: 0 });
		dispatch({ type: "duration", duration: 0 });
		stopProgressInterval();
	}, [stopProgressInterval]);

	const onLoadStart = useCallback(() => {
		setLoadingWithTimeout(true);
	}, [setLoadingWithTimeout]);

	return {
		// State
		isPlaying: state.isPlaying,
		isLoading: state.isLoading,
		currentTime: state.currentTime,
		duration: state.duration,
		volume: state.volume,
		isMuted: state.isMuted,

		// Commands
		play,
		pause,
		toggle,
		seek,
		setVolume,
		toggleMute,

		// Event handlers for audio element
		onPlay,
		onPlaying,
		onPause,
		onTimeUpdate,
		onLoadedMetadata,
		onDurationChange,
		onCanPlay,
		onCanPlayThrough,
		onWaiting,
		onStalled,
		onSeeking,
		onSeeked,
		onEnded,
		onError,
		onEmptied,
		onLoadStart,
	};
}
