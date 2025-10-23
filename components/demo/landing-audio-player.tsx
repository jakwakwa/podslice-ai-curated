"use client"

import { useEffect, useRef, useState } from "react"
import styles from "@/styles/landing-page-content.module.css"


const NUM_BARS = 40

const generateSeedPattern = (length: number) => {
	return Array.from({ length }, (_, index) => {
		const base = 0.4 + 0.35 * Math.sin(index * 0.35)
		const jitter = 0.08 * Math.sin(index * 0.9 + 0.5)
		return Math.max(0.08, Math.min(0.95, base + jitter))
	})
}

export default function LandingAudioPlayer() {
	const [isPlaying, setIsPlaying] = useState(false)
	const audioRef = useRef<HTMLAudioElement>(null)
	const [bars, setBars] = useState<number[]>([])

	// Web Audio
	const audioCtxRef = useRef<AudioContext | null>(null)
	const analyserRef = useRef<AnalyserNode | null>(null)
	const freqArrayRef = useRef<Uint8Array | null>(null)

	// Animation
	const rafIdRef = useRef<number | null>(null)
	const barElsRef = useRef<Array<HTMLDivElement | null>>([])
	const prevHeightsRef = useRef<number[]>([])
	const phaseRef = useRef<number>(0)

	/* biome-ignore lint/correctness/useExhaustiveDependencies: seed once on mount */
	useEffect(() => {
		// Render fixed number of bars and prime seed pattern
		setBars(Array.from({ length: NUM_BARS }, () => 0))
		// Initialize bar refs store
		barElsRef.current = Array(NUM_BARS).fill(null)
		prevHeightsRef.current = generateSeedPattern(NUM_BARS)
		// Apply seed pattern initially
		requestAnimationFrame(() => applyHeights(prevHeightsRef.current))
	}, [])

	/* biome-ignore lint/correctness/useExhaustiveDependencies: controlled by isPlaying only */
	useEffect(() => {
		if (isPlaying) {
			startAudio()
		} else {
			stopAudio()
		}
	}, [isPlaying])

	function startAudio() {
		const audioElement = audioRef.current
		if (!audioElement) return

		// Lazy-init AudioContext and Analyser on first play (required for Safari/iOS policies)
		if (!audioCtxRef.current) {
			const AudioContextCtor = (typeof AudioContext !== "undefined" ? AudioContext : (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
				| typeof AudioContext
				| undefined
			if (!AudioContextCtor) return
			audioCtxRef.current = new AudioContextCtor()
		}
		const audioCtx = audioCtxRef.current
		if (!audioCtx) return

		if (audioCtx.state === "suspended") {
			void audioCtx.resume()
		}

		if (!analyserRef.current) {
			const source = audioCtx.createMediaElementSource(audioElement)
			const analyser = audioCtx.createAnalyser()
			analyser.fftSize = 2048
			analyser.smoothingTimeConstant = 0.85
			source.connect(analyser)
			analyser.connect(audioCtx.destination)
			analyserRef.current = analyser
			freqArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
		}

		void audioElement.play()
		startAnimationLoop()
	}

	function stopAudio() {
		// Pause playback
		audioRef.current?.pause()
		// Stop animation
		if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
		rafIdRef.current = null
		// Ease back to a pleasant seed pattern
		const seed = generateSeedPattern(NUM_BARS)
		smoothTransitionTo(seed, 180)
	}

	function startAnimationLoop() {
		const analyser = analyserRef.current
		const freqArray = freqArrayRef.current
		if (!(analyser && freqArray)) return

		const numBins = freqArray.length
		const binsPerBar = Math.max(1, Math.floor(numBins / NUM_BARS))

		const animate = () => {
			analyser.getByteFrequencyData(freqArray)

			// Aggregate frequency bins into NUM_BARS buckets
			const barHeights: number[] = new Array(NUM_BARS).fill(0)
			for (let i = 0; i < NUM_BARS; i++) {
				let sum = 0
				const start = i * binsPerBar
				const end = Math.min(start + binsPerBar, numBins)
				// @ts-ignore
				for (let j = start; j < end; j++) sum += freqArray[j]
				const denom = Math.max(1, end - start)
				const avg = sum / denom
				// Normalize to 0.08..0.95 range to avoid zeroing out bars
				const normalized = Math.max(0.08, Math.min(0.95, avg / 255))
				barHeights[i] = normalized
			}

			// Neighbor smoothing (1-2-1 kernel)
			for (let i = 0; i < NUM_BARS; i++) {
				const left = i > 0 ? barHeights[i - 1] : barHeights[i]
				const center = barHeights[i]
				const right = i < NUM_BARS - 1 ? barHeights[i + 1] : barHeights[i]
				// @ts-ignore
				barHeights[i] = (left + 2 * center + right) / 4
			}

			// Temporal smoothing with previous frame (low-pass)
			const prev = prevHeightsRef.current
			for (let i = 0; i < NUM_BARS; i++) {
				// @ts-ignore
				barHeights[i] = prev[i] * 0.6 + barHeights[i] * 0.4
			}

			// Subtle traveling wave modulation for visual cohesion
			phaseRef.current += 0.06
			const phase = phaseRef.current
			for (let i = 0; i < NUM_BARS; i++) {
				const mod = 0.9 + 0.1 * Math.sin(phase + i * 0.25)
				// @ts-ignore
				barHeights[i] = Math.max(0.06, Math.min(0.98, barHeights[i] * mod))
			}

			prevHeightsRef.current = barHeights
			applyHeights(barHeights)

			rafIdRef.current = requestAnimationFrame(animate)
		}

		if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
		rafIdRef.current = requestAnimationFrame(animate)
	}

	function applyHeights(heights: number[]) {
		// Apply via transforms for GPU-friendly updates
		for (let i = 0; i < heights.length; i++) {
			const el = barElsRef.current[i]
			if (!el) continue
			// @ts-ignore
			el.style.transform = `scaleY(${heights[i].toFixed(3)})`
		}
	}

	function smoothTransitionTo(targetHeights: number[], durationMs: number) {
		const startHeights = prevHeightsRef.current.slice()
		const start = performance.now()

		const step = (now: number) => {
			const t = Math.min(1, (now - start) / durationMs)
			const ease = t * (2 - t) // easeOutQuad
			const blended = startHeights.map(
				// @ts-ignore
				(v, i) => v * (1 - ease) + targetHeights[i] * ease)
			prevHeightsRef.current = blended
			applyHeights(blended)
			if (t < 1) requestAnimationFrame(step)
		}
		requestAnimationFrame(step)
	}

	useEffect(() => {
		return () => {
			if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
			audioRef.current?.pause()
			try {
				audioCtxRef.current?.close()
			} catch {
				// ignore
			}
		}
	}, [])

	return (
		<div className={styles.audioPlayerContainer}>
			<div className="flex justify-center m-0 w-[60px]">
				<button className={styles.playPauseButton} onClick={() => setIsPlaying(v => !v)} aria-label={isPlaying ? "Pause" : "Play"} type="button">
					{isPlaying ? (
						<svg className={styles.playButtonIcon} viewBox="0 0 32 32" fill="currentColor">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
						</svg>
					) : (
						<svg className={styles.playButtonIcon} viewBox="0 0 32 32" fill="currentColor">
							<path d="M8 5v14l11-7z" />
						</svg>
					)}
				</button>
			</div>
			<div className="w-[100%] flex flex-col">


				{/** biome-ignore lint/a11y/useMediaCaption: <keep> */}
				<audio ref={audioRef} src="/Podslice_ AI's Solution to Information Overload and Content Drowning.mp3" onEnded={() => setIsPlaying(false)} />
				<div className={styles.waveformContainer}>


					{bars.map((_, index) => (
						<div
							key={index}
							className={styles.waveformBar}
							ref={_el => {
								barElsRef.current[index] = _el
							}}
							// initial transform set via seed pattern in effect
							style={{ transform: `scaleY(${prevHeightsRef.current[index]?.toFixed(3) ?? 0.4})` }}
						/>
					))}
				</div>
			</div>
		</div>
	)
}
