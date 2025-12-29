"use client";

import { useUser } from "@clerk/nextjs";
import {
	ChevronDown,
	ChevronRight,
	Eye,
	HelpCircle,
	InfoIcon,
	MessageSquareWarning,
	PlayCircle,
	SparklesIcon,
	VideoIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { type AssetSuggestion, detectRelevantAssets } from "@/app/actions/detect-assets";
import { LongEpisodeWarningDialog } from "@/components/features/episode-generation/long-episode-warning-dialog";
import { SummaryLengthSelector } from "@/components/features/episode-generation/summary-length-selector";
import { AddAssetDialog } from "@/components/research-vault/add-asset-dialog";
import { SelectAssetDialog } from "@/components/research-vault/select-asset-dialog";
import { Button } from "@/components/ui/button";
import ComponentSpinner from "@/components/ui/component-spinner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRICING_TIER } from "@/config/paddle-config";
import { VOICE_OPTIONS } from "@/lib/constants/voices";
import { getMaxDurationSeconds } from "@/lib/env";
import { useNotificationStore } from "@/lib/stores";
import type { SummaryLengthOption } from "@/lib/types/summary-length";
import { FormAccordion } from "./form-accordion";
import { UsageDisplay } from "./usage-display";

const EPISODE_LIMIT = PRICING_TIER[2]?.episodeLimit ?? 30;
const YT_MAX_DURATION_SECONDS = getMaxDurationSeconds();

console.log(
	"[DEBUG] Component initialized with YT_MAX_DURATION_SECONDS:",
	YT_MAX_DURATION_SECONDS
);
// Define a base schema

// const baseFormSchema = z.object({
// 	youtubeUrl: z.string().url({ message: "Please enter a valid YouTube URL." }),
// 	episodeTitle: z.string().min(2, "Title must be at least 2 characters."),
// 	// We'll add the duration check dynamically
// });
function isYouTubeUrl(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		const host = hostname.toLowerCase();
		return (
			host === "youtu.be" ||
			host.endsWith(".youtu.be") ||
			host === "youtube.com" ||
			host.endsWith(".youtube.com")
		);
	} catch {
		return false;
	}
}

export default function SummaryCreator() {
	const router = useRouter();
	const { user } = useUser();
	const { resumeAfterSubmission } = useNotificationStore();

	// Mode toggle
	const [creatorMode, setCreatorMode] = useState<"youtube" | "news">("youtube");

	const [youtubeUrl, setYouTubeUrl] = useState("");
	const [debouncedYoutubeUrl] = useDebounce(youtubeUrl, 500);

	const [youtubeUrlError, setYouTubeUrlError] = useState<string | null>(null);
	const [videoTitle, setVideoTitle] = useState<string | null>(null);
	const [videoDuration, setVideoDuration] = useState<number | null>(null);
	const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

	const [podcastName, setPodcastName] = useState("");

	// Research Lab State
	// Research Lab State
	const [_referenceDocUrl, _setReferenceDocUrl] = useState("");
	// Research Lab State
	const [referenceDocUrl, setReferenceDocUrl] = useState("");
	const [selectedAssetTitle, setSelectedAssetTitle] = useState<string | null>(null);
	const [contextWeight, setContextWeight] = useState([50]); // Default 50%

	// News input state
	const NEWS_SOURCES = [
		{ id: "global", label: "Global", tip: "Guardian, BBC, Reuters, Al Jazeera" }, ///Guardian, BBC, Reuters, Al Jazeera"
		{ id: "crypto", label: "Top Crypto Sources", tip: "Coindesk, TradingView" },
		{ id: "us", label: "US News", tip: "CNN, SKY, ABC, NY TIMES" },
		{
			id: "finance",
			label: "Financial Sources",
			tip: "Bloomberg,Barrons, Tradingview, Yahoo Finance",
		},
		{ id: "geo", label: "United Nations, World Bank", tip: "UN, World Bank" },
	] as const;

	const [selectedSources, setSelectedSources] = useState<string[]>([]);
	const [selectedTopic, setSelectedTopic] = useState("");

	// Smart Suggestions State
	const [suggestedAssets, setSuggestedAssets] = useState<AssetSuggestion[]>([]);

	// Effect to trigger detection when metadata is loaded
	useEffect(() => {
		if (videoTitle && creatorMode === "youtube") {
			const detect = async () => {
				// Debounce or just run once when title is set
				const assets = await detectRelevantAssets(videoTitle, ""); // Description not available in metadata yet?
				if (assets.length > 0) {
					setSuggestedAssets(assets);
				}
			};
			detect();
		}
	}, [videoTitle, creatorMode]);

	// Generation options
	const [generationMode, setGenerationMode] = useState<"single" | "multi">("single");
	const [voiceA, setVoiceA] = useState<string>("Leda");
	const [voiceB, setVoiceB] = useState<string>("Orus");
	const [isPlaying, setIsPlaying] = useState<string | null>(null);
	const [isLoadingSample, setIsLoadingSample] = useState<string | null>(null);
	const [audioUrlCache, setAudioUrlCache] = useState<Record<string, string>>({});
	const [maxDuration, setMaxDuration] = useState<number | null>(120); // Default to 120 minutes
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [usage, setUsage] = useState({ count: 0, limit: EPISODE_LIMIT });
	const [isLoadingUsage, setIsLoadingUsage] = useState(true);

	// Restriction dialog state
	const [_showRestrictionDialog, setShowRestrictionDialog] = useState(false);

	// Tips visibility state
	const [showTips, setShowTips] = useState(false);

	// Summary length state
	const [summaryLength, setSummaryLength] = useState<SummaryLengthOption>("MEDIUM");
	const [showLongWarning, setShowLongWarning] = useState(false);

	const isBusy = isCreating || isFetchingMetadata;
	const isAudioBusy = isPlaying !== null || isLoadingSample !== null;

	const isDurationValid =
		videoDuration !== null &&
		(maxDuration
			? videoDuration <= maxDuration * 60
			: videoDuration <= YT_MAX_DURATION_SECONDS);

	const canSubmitYouTube =
		Boolean(videoTitle) &&
		isYouTubeUrl(youtubeUrl) &&
		!isBusy &&
		isDurationValid &&
		videoDuration !== null &&
		(maxDuration
			? videoDuration <= maxDuration * 60
			: videoDuration <= YT_MAX_DURATION_SECONDS);

	const canSubmitNews =
		!isBusy &&
		selectedSources.length > 0 &&
		Boolean(selectedTopic) &&
		(generationMode === "single" || (voiceA && voiceB));

	const canSubmit = creatorMode === "youtube" ? canSubmitYouTube : canSubmitNews;

	const fetchUsage = useCallback(async () => {
		try {
			setIsLoadingUsage(true);
			const res = await fetch("/api/user-episodes?count=true");
			if (res.ok) {
				const { count } = await res.json();
				setUsage({ count, limit: EPISODE_LIMIT });
			}
		} catch (error) {
			console.error("Failed to fetch user episodes data:", error);
		} finally {
			setIsLoadingUsage(false);
		}
	}, []);

	useEffect(() => {
		fetchUsage();
	}, [fetchUsage]);

	useEffect(() => {
		// Clear any previous errors when URL changes
		if (youtubeUrl !== debouncedYoutubeUrl) {
			setYouTubeUrlError(null);
		}
	}, [youtubeUrl, debouncedYoutubeUrl]);

	useEffect(() => {
		// Show duration error immediately when videoDuration is set and invalid
		console.log(
			"[DEBUG] Duration validation useEffect triggered, videoDuration:",
			videoDuration,
			"maxDuration:",
			maxDuration
		);
		const maxSeconds = maxDuration ? maxDuration * 60 : YT_MAX_DURATION_SECONDS;
		if (videoDuration !== null && videoDuration > maxSeconds) {
			const maxMinutes = Math.floor(maxSeconds / 60);
			const errorMsg = `Video is too long. Please select a video that is ${maxMinutes} minutes or less. This video is ${Math.round(videoDuration / 60)} minutes long.`;
			console.log("[DEBUG] Setting duration error:", errorMsg);
			setYouTubeUrlError(errorMsg);
		} else if (videoDuration !== null && videoDuration <= maxSeconds) {
			// Clear duration error if video is now valid
			console.log("[DEBUG] Clearing duration error - video is valid");
			setYouTubeUrlError(null);
		} else {
			console.log("[DEBUG] No duration validation action needed");
		}
	}, [videoDuration, maxDuration]);

	// Timer effect for restriction dialog
	useEffect(() => {
		let timer: NodeJS.Timeout;

		if (!isLoadingUsage && usage.count >= usage.limit) {
			timer = setTimeout(() => {
				setShowRestrictionDialog(true);
			}, 3000); // 3 second delay
		}

		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [isLoadingUsage, usage.count, usage.limit]);

	useEffect(() => {
		// Fetch the dynamic configuration from our new API endpoint
		const fetchConfig = async () => {
			try {
				const response = await fetch("/api/config/processing");
				const config = await response.json();
				if (config.maxVideoDurationMinutes) {
					setMaxDuration(config.maxVideoDurationMinutes);
					// Dynamically update the form schema with the fetched duration limit
				}
			} catch (error) {
				console.error("Failed to fetch processing config:", error);
				toast.error("Could not load creation limits. Please refresh.");
			}
		};

		fetchConfig();
	}, []);

	useEffect(() => {
		if (creatorMode !== "youtube") return;
		async function fetchMetadata() {
			console.log("[DEBUG] fetchMetadata called with URL:", debouncedYoutubeUrl);
			setYouTubeUrlError(null);
			if (isYouTubeUrl(debouncedYoutubeUrl)) {
				console.log("[DEBUG] URL is valid YouTube URL, fetching metadata...");
				setIsFetchingMetadata(true);
				setVideoTitle(null);
				setVideoDuration(null);
				try {
					const res = await fetch(
						`/api/youtube-metadata?url=${encodeURIComponent(debouncedYoutubeUrl)}`
					);
					console.log("[DEBUG] YouTube metadata API response status:", res.status);
					if (!res.ok) {
						throw new Error("Could not fetch video details. Please check the URL.");
					}
					const { title, duration } = await res.json();
					console.log(
						"[DEBUG] Fetched metadata - title:",
						title,
						"duration:",
						duration,
						"seconds"
					);
					console.log(
						"[DEBUG] maxDuration (minutes):",
						maxDuration,
						"YT_MAX_DURATION_SECONDS fallback:",
						YT_MAX_DURATION_SECONDS
					);
					const maxSeconds = maxDuration ? maxDuration * 60 : YT_MAX_DURATION_SECONDS;
					console.log("[DEBUG] Using maxSeconds for validation:", maxSeconds);
					console.log(
						"[DEBUG] Duration check:",
						duration > maxSeconds ? "TOO LONG" : "OK"
					);
					setVideoTitle(title);
					setVideoDuration(duration);
				} catch (err) {
					console.error("[DEBUG] Error fetching metadata:", err);
					setYouTubeUrlError(
						err instanceof Error ? err.message : "An unknown error occurred."
					);
				} finally {
					setIsFetchingMetadata(false);
				}
			} else {
				console.log("[DEBUG] URL is not a valid YouTube URL");
				setVideoTitle(null);
				setVideoDuration(null);
				if (debouncedYoutubeUrl) {
					setYouTubeUrlError("Please enter a valid YouTube URL.");
				}
			}
		}
		fetchMetadata();
	}, [creatorMode, debouncedYoutubeUrl, maxDuration]);

	async function handleCreate() {
		console.log("[DEBUG] handleCreate called with canSubmit:", canSubmit);
		console.log("[DEBUG] handleCreate validation state:", {
			canSubmit,
			creatorMode,
		});

		if (!canSubmit) {
			console.log("[DEBUG] handleCreate blocked by canSubmit check");
			return;
		}

		setIsCreating(true);
		setError(null);

		try {
			if (creatorMode === "news") {
				const payload = {
					title: `News summary: ${selectedTopic}`,
					sources: selectedSources,
					topic: selectedTopic,
					generationMode,
					voiceA,
					voiceB,
					summaryLength,
				};
				const res = await fetch("/api/user-episodes/create-news", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
				if (!res.ok) throw new Error(await res.text());
				toast.message(
					"We're processing your episode and will email you when it's ready.",
					{
						duration: Infinity,
						action: { label: "Dismiss", onClick: () => {} },
					}
				);
				resumeAfterSubmission();
				router.push("/dashboard?from=generate");
				return;
			}

			// YouTube mode validation
			if (!videoTitle) {
				console.log("[DEBUG] handleCreate blocked: no video title");
				setError("Video title is required. Please wait for the video details to load.");
				return;
			}
			if (!isYouTubeUrl(youtubeUrl)) {
				console.log("[DEBUG] handleCreate blocked: invalid YouTube URL");
				setError("Please enter a valid YouTube URL.");
				return;
			}
			if (!videoDuration) {
				console.log("[DEBUG] handleCreate blocked: no video duration");
				setError("Video duration could not be determined. Please try a different URL.");
				return;
			}
			if (videoDuration > (maxDuration ? maxDuration * 60 : YT_MAX_DURATION_SECONDS)) {
				console.log("[DEBUG] handleCreate blocked: duration too long");
				const maxSeconds = maxDuration ? maxDuration * 60 : YT_MAX_DURATION_SECONDS;
				const maxMinutes = Math.floor(maxSeconds / 60);
				setError(
					`Video is too long. Please select a video that is ${maxMinutes} minutes or less. This video is ${Math.round(videoDuration / 60)} minutes long.`
				);
				return;
			}

			console.log("[DEBUG] handleCreate proceeding with YouTube episode creation");
			const payload = {
				title: videoTitle,
				youtubeUrl: youtubeUrl,
				podcastName: podcastName || undefined,
				generationMode,
				voiceA,
				voiceB,
				summaryLength,
				// B2B Research Lab
				referenceDocUrl: referenceDocUrl || undefined,
				contextWeight: referenceDocUrl ? (contextWeight?.[0] ?? 50) / 100 : undefined,
				voiceArchetype: voiceA, // Use selected voice mapping
			};
			const res = await fetch("/api/user-episodes/create-from-metadata", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error(await res.text());
			toast.message("We're processing your episode and will email you when it's ready.", {
				duration: Infinity,
				action: { label: "Dismiss", onClick: () => {} },
			});
			resumeAfterSubmission();
			router.push("/dashboard?from=generate");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to start episode generation."
			);
			toast.error(
				(err instanceof Error ? err.message : "Failed to start episode generation.") ||
					"",
				{ duration: Infinity, action: { label: "Dismiss", onClick: () => {} } }
			);
		} finally {
			setIsCreating(false);
		}
	}

	async function playSample(voiceName: string) {
		try {
			const cached = audioUrlCache[voiceName];
			let url: string;

			// If not cached, set loading state and fetch
			if (!cached) {
				const voiceConfig = VOICE_OPTIONS.find(v => v.id === voiceName);

				if (voiceConfig?.sampleUrl) {
					url = voiceConfig.sampleUrl;
					setAudioUrlCache(prev => ({ ...prev, [voiceName]: url }));
				} else {
					setIsLoadingSample(voiceName);
					const res = await fetch(
						`/api/tts/voice-sample?voice=${encodeURIComponent(voiceName)}`
					);
					if (!res.ok) throw new Error(await res.text());
					// Get the array buffer and explicitly create a blob with audio/wav MIME type
					const arrayBuffer = await res.arrayBuffer();
					const blob = new Blob([arrayBuffer], { type: "audio/wav" });
					const newUrl = URL.createObjectURL(blob);
					setAudioUrlCache(prev => ({ ...prev, [voiceName]: newUrl }));
					setIsLoadingSample(null);
					url = newUrl;
				}
			} else {
				url = cached;
			}

			// Set playing state and play audio
			setIsPlaying(voiceName);
			const audio = new Audio(url);
			audio.onended = () => setIsPlaying(null);
			audio.onerror = e => {
				console.error("Audio playback error:", e);
				throw new Error("Audio element failed to load source");
			};
			await audio.play();
		} catch (err) {
			setIsPlaying(null);
			setIsLoadingSample(null);
			console.error("Failed to play sample", err);
			toast.error("Could not load voice sample");
		}
	}

	// const hasReachedLimit = usage.count >= usage.limit;
	const _handleUpgradeMembership = () => router.push("/manage-membership");
	const _handleGoBack = () => router.back();

	return (
		<div className="max-w-6xl mx-auto p-0 md:p-6 text-foreground">
			{/* Two Column Grid Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Form Area (2/3) */}
				<div className="lg:col-span-2 space-y-6">
					{/* Pick Summary Type Card */}
					<div className="bg-[#0f1115] rounded-3xl p-6 md:p-8 border border-zinc-800 shadow-xl">
						<span className="block text-sm font-medium text-emerald-400 mb-2">
							Pick a Summary Type:
						</span>
						<p className="text-xs text-zinc-400 mb-4">
							{creatorMode === "youtube"
								? "Instructions: To find the youtube link, go to the video, click the share button below the video, copy the link that pop-up and paste it over here."
								: "Want to catch up on the latest news? Select your desired sources and topics. Our AI will get to work and create a custom summary (both audio and text) just for you."}
						</p>
						<div className="flex flex-wrap gap-4">
							<Button
								type="button"
								onClick={() => setCreatorMode("youtube")}
								disabled={isBusy}
								className={
									creatorMode === "youtube"
										? "px-6 py-2.5 rounded-full bg-violet-500 text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
										: "px-6 py-2.5 rounded-full bg-transparent border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-all hover:border-zinc-500"
								}>
								Podcast Summary
							</Button>
							<Button
								type="button"
								onClick={() => setCreatorMode("news")}
								disabled={isBusy}
								className={
									creatorMode === "news"
										? "px-6 py-2.5 rounded-full bg-violet-500 text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
										: "px-6 py-2.5 rounded-full bg-transparent border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-all hover:border-zinc-500"
								}>
								Research Summary
							</Button>
						</div>
						<form
							className=" w-full"
							onSubmit={e => {
								console.log("[DEBUG] Form onSubmit triggered, canSubmit:", canSubmit);
								e.preventDefault();
								// Prevent submission if validation fails
								if (!canSubmit) {
									console.log("[DEBUG] Form submission blocked by canSubmit check");
									return;
								}
								console.log("[DEBUG] Form submission proceeding to handleCreate");
								void handleCreate();
							}}>
							{creatorMode === "youtube" && (
								<div className="p-0">
									<div className="space-y-2 md:w-ful overflow-hidden bg-card p-5 my-8 gap-4 mx-0 md:mx-0 border border-border rounded-3xl  shadow-md p-8l md:min-w-fit">
										<Label htmlFor="youtubeUrl">
											Link to podcast episode ( YouTube only )
										</Label>
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type="button"
													className="flex text-xs flex-row items-center text-emerald-200/80 py-1 gap-2">
													<HelpCircle
														className="text-xs top-7 md:top-3 right-4 text-emerald-400"
														size={16}
													/>
													<span className="text-xs">
														Need help finding the link you need?
													</span>
												</button>
											</TooltipTrigger>
											<span className="hidden">Hover</span>
											<TooltipContent className="bg-zinc-900 border border-zinc-800 backdrop-blur-sm flex flex-col items-center justify-center shadow-lg">
												<p className="text-sm text-white cursor-default font-bold">
													Quick Guide: How to Find and Paste YouTube Link
												</p>
												<Image
													width={1000}
													height={1000}
													src="/how-to-get-link.gif"
													alt="How to get the link"
													className="w-full h-full object-cover my-2 border border-border rounded-md max-w-lg object-center"
												/>
											</TooltipContent>
										</Tooltip>
										<Input
											className="max-h-4"
											id="youtubeUrl"
											placeholder="https://www.youtube.com/..."
											value={youtubeUrl}
											onChange={e => setYouTubeUrl(e.target.value)}
											disabled={isBusy}
											required
										/>

										{isFetchingMetadata && <ComponentSpinner />}
										{youtubeUrlError && (
											<p className="flex bg-destructive px-2.5 py-1 text-destructive-foreground text-xs mt-2 rounded-md outline-1 outline-destructive">
												{" "}
												<span className="flex items-center gap-3">
													{" "}
													<MessageSquareWarning width={32} /> {youtubeUrlError}
												</span>
											</p>
										)}
										<span className="pl-0 text-[0.6rem]  font-medium text-primary-foreground uppercase">
											Max video duration {maxDuration} minutes allowed
										</span>
									</div>

									{videoTitle && (
										<>
											{" "}
											<div className="flex mt-4 flex-row items-center gap-2">
												<Eye
													className="text-xs top-7 md:top-3 right-4 text-emerald-400"
													size={16}
												/>
												<span className="text-xs text-indigo-200">
													<span className="font-bold text-emerald-300">
														Quick Review:
													</span>{" "}
													Confirm the video details below are correct
												</span>
											</div>
											<div className="bg-red-950/20 my-3 md:col-span-2 py-3 px-4 rounded-sm outline-1 outline-purple-900 shadow-sm max-w-sm  ">
												<p className=" font-normal text-purple-300 flex text-[0.6rem] items-center gap-2 py-1">
													<VideoIcon width={14} height={14} color="purple" />
													Youtube Video Link:
												</p>
												<p className="text-violet-200/70 font-light text-[0.79rem] leading-tight">
													{videoTitle}
												</p>
												{videoDuration !== null && (
													<p className="text-[0.6rem] py-1 font-mono text-purple-400">
														{Math.floor(videoDuration / 60)}m {videoDuration % 60}s
													</p>
												)}
											</div>
										</>
									)}
								</div>
							)}

							{/* Smart Suggestion UI - Phase 4 Integration -> Moved to Research Lab Context */}

							{creatorMode === "news" && (
								<div className="bg-transparent m-0 p-0 rounded-3xl flex flex-col gap-6 w-full">
									<div className="w-full border border-zinc-800 rounded-3xl bg-[#16191d] shadow-md p-6">
										<Label
											htmlFor="selectedTopicId"
											className="text-emerald-400 mb-2 block">
											Topic
										</Label>
										<Input
											placeholder="Research any topic..."
											id="selectedTopicId"
											onChange={e => setSelectedTopic(e.target.value)}
											value={selectedTopic}
											disabled={isBusy}
											required
										/>
									</div>
									<div className="border border-border rounded-3xl  shadow-md py-3 px-5 md:p-8 space-y-2 md:col-span-2 lg:min-w-full text-sm">
										<Label className="font-extrabold">Sources</Label>
										<span className="text-foreground/70">
											Pick your sources, or leave it to the Ai to decide
										</span>
										<div className="flex w-full mt-4 justify-start items-start flex-wrap gap-4">
											{NEWS_SOURCES.map(s => {
												const active = selectedSources.includes(s.id);
												return (
													<div key={s.id} className="flex items-center gap-2">
														<Button
															type="button"
															variant={active ? "outline" : "default"}
															onClick={() =>
																setSelectedSources(prev =>
																	active ? prev.filter(p => p !== s.id) : [...prev, s.id]
																)
															}
															disabled={isBusy}
															className="px-3 py-1 my-1">
															{s.label}
															<Tooltip>
																<TooltipTrigger asChild>
																	<div className="inline-flex items-center">
																		<InfoIcon
																			className="text-xs text-muted-foreground hover:text-foreground"
																			size={16}
																		/>
																		<span className="sr-only">
																			More info about {s.label}
																		</span>
																	</div>
																</TooltipTrigger>
																<TooltipContent className="bg-white">
																	<p className="text-sm text-black cursor-default">
																		{s?.tip}
																	</p>
																</TooltipContent>
															</Tooltip>
														</Button>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							)}

							{creatorMode === "youtube" && (
								<FormAccordion
									value="research-lab"
									className="my-8"
									title="Research Lab Context">
									<div className="space-y-4 pt-2">
										<div className="flex flex-col gap-4">
											<div className="flex flex-row justify-between items-center">
												<Label>Context Source</Label>
												{/* Suggestion Badge/Button */}
												{suggestedAssets.length > 0 && !referenceDocUrl && (
													<Button
														variant="secondary"
														size="sm"
														className="h-7 gap-2 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 animate-pulse"
														onClick={() => {
															const asset = suggestedAssets[0];
															if (!asset) return;
															setReferenceDocUrl(asset.sourceUrl);
															setSelectedAssetTitle(asset.title);
															setSuggestedAssets([]);
															toast.success(`Auto-linked: ${asset.title}`);
														}}>
														<SparklesIcon className="w-3 h-3" />
														Quick Add: {suggestedAssets[0]?.title}
													</Button>
												)}
											</div>

											{!referenceDocUrl ? (
												<div className="flex gap-3">
													<SelectAssetDialog
														onSelect={asset => {
															setReferenceDocUrl(asset.sourceUrl);
															setSelectedAssetTitle(asset.title);
														}}
													/>
													{user?.id && <AddAssetDialog userId={user.id} />}
												</div>
											) : (
												<div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3">
													<div className="flex items-center gap-3 overflow-hidden">
														<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
															<InfoIcon className="h-4 w-4 text-primary" />
														</div>
														<div className="flex flex-col overflow-hidden">
															<span className="truncate text-sm font-medium">
																{selectedAssetTitle || "Selected Document"}
															</span>
															<span className="truncate text-xs text-muted-foreground">
																{referenceDocUrl}
															</span>
														</div>
													</div>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
														onClick={() => {
															setReferenceDocUrl("");
															setSelectedAssetTitle(null);
														}}>
														<span className="sr-only">Remove</span>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="2"
															strokeLinecap="round"
															strokeLinejoin="round"
															className="h-4 w-4">
															<path d="M18 6 6 18" />
															<path d="m6 6 12 12" />
														</svg>
													</Button>
												</div>
											)}
										</div>

										{referenceDocUrl && (
											<div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-border/50">
												<div className="flex justify-between items-center">
													<Label className="text-xs font-bold">Context Weighting</Label>
													<span className="text-xs font-mono bg-primary/20 px-2 py-0.5 rounded text-primary">
														{contextWeight[0]}% Document
													</span>
												</div>
												<Slider
													value={contextWeight}
													onValueChange={setContextWeight}
													max={100}
													step={5}
													className="py-4"
												/>
												<div className="flex justify-between text-[0.6rem] text-muted-foreground uppercase font-bold px-1">
													<span>Podcast Audio</span>
													<span>Reference Doc</span>
												</div>
											</div>
										)}
									</div>
								</FormAccordion>
							)}

							<div className="hidden not-only:grid-cols-1 gap-4 w-full">
								<div className="space-y-2">
									<Label htmlFor="podcastName">Podcast Name (optional)</Label>
									<Input
										id="podcastName"
										placeholder="Podcast show name"
										value={podcastName}
										onChange={e => setPodcastName(e.target.value)}
										disabled={isBusy}
									/>
								</div>
							</div>

							<FormAccordion
								value="voice-settings"
								title="Voice Settings"
								className="mt-4">
								<div className="">
									<div className="w-[250px] flex flex-col gap-0 md:min-w-full ">
										<div className="flex flex-row gap-3 mt-4">
											<Button
												type="button"
												variant={generationMode === "single" ? "default" : "outline"}
												onClick={() => setGenerationMode("single")}
												disabled={isBusy}
												className="px-4">
												Single speaker
											</Button>
											<Button
												type="button"
												variant={generationMode === "multi" ? "default" : "outline"}
												onClick={() => setGenerationMode("multi")}
												disabled={isBusy}
												className="px-4">
												Multi speaker
											</Button>
										</div>
										<button
											type="button"
											onClick={() => setShowTips(!showTips)}
											className="flex mt-4 w-32 h-1 items-center gap-2 font-medium text-emerald-400/80 hover:text-foreground transition-colors mb-3 text-[0.7rem] py-4 uppercase ">
											{showTips ? (
												<ChevronDown className="h-4 w-4 md:max-10 " />
											) : (
												<ChevronRight className="h-4 w-4" />
											)}
											💡 Helpful Tips
										</button>

										{showTips && (
											<div className="space-y-3 p-4 bg-secondary shadow-sm mb-4	 rounded-xl w-full min-w-full md:max-w-full md:min-w-full ">
												<ul className="space-y-2 leading-relaxed text-primary-foreground text-xs mt-1 md:max-w-full ">
													<li className="flex items-start gap-2">
														<span>
															<strong>Multi Speaker</strong> For more engaging information
															consumption.
														</span>
													</li>

													<li className="flex items-start gap-2">
														<span>
															<strong>Best results come from:</strong> Clear audio,
															minimal background noise, and well-structured content
														</span>
													</li>
													<li className="flex items-start gap-2">
														<span>💡</span>
														<span>
															<strong>Pro tip:</strong> If you're unsure, start with
															Single Speaker - it's our most reliable option for any
															content type
														</span>
													</li>
													<li className="flex items-start gap-2">
														<span className="text-red-500">⚠️</span>
														<span>
															<strong className="text-emerald-400">Avoid:</strong>{" "}
															Music-heavy content, very fast speech, or videos with poor
															audio quality
														</span>
													</li>
												</ul>
											</div>
										)}
									</div>

									{generationMode === "single" && (
										<div className="space-y-4 md:w-full ">
											<div>
												<div className="py-2 pl-2 uppercase font-bold text-secondary-foreground text-xs">
													Voice
												</div>
												<Select value={voiceA} onValueChange={setVoiceA}>
													<SelectTrigger className="w-full" disabled={isBusy}>
														<SelectValue placeholder="Select Voice" />
													</SelectTrigger>
													<SelectContent>
														{VOICE_OPTIONS.map(v => (
															<SelectItem key={v.id} value={v.id}>
																<div className="flex items-center justify-between w-full gap-3">
																	<span>{v.label}</span>
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<div className="mt-4">
													<Button
														type="button"
														variant="outline"
														size="sm"
														className="text-[10px] p-0"
														onClick={() => void playSample(voiceA)}
														disabled={isBusy || isAudioBusy}>
														<PlayCircle className="mr-1 h-2 w-2" />{" "}
														{isLoadingSample === voiceA
															? "Loading sample"
															: isPlaying === voiceA
																? "Playing"
																: "Play sample"}
													</Button>
												</div>
											</div>
										</div>
									)}

									{generationMode === "multi" && (
										<div className="flex flex-col md:flex-row justify-start md:max-w-full md:grid-cols-2 gap-12">
											{/* voice a */}
											<div>
												<div className="py-2 pl-2 uppercase font-bold text-secondary-foreground text-xs">
													Voice A
												</div>
												<Select value={voiceA} onValueChange={setVoiceA}>
													<SelectTrigger className="w/full" disabled={isBusy}>
														<SelectValue placeholder="Select Voice A" />
													</SelectTrigger>
													<SelectContent>
														{VOICE_OPTIONS.map(v => (
															<SelectItem key={v.id} value={v.id}>
																<div className="flex items-center justify-between w/full gap-3 ">
																	<div className="flex flex-col">
																		<span>{v.label}</span>
																	</div>
																	<button
																		type="button"
																		onMouseDown={e => e.preventDefault()}
																		onClick={e => {
																			e.stopPropagation();
																			void playSample(v.id);
																		}}
																		aria-label={`Play ${v.label} sample`}
																		className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 mt-3"></button>
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<div className="mt-4 md:max-w-full ">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => void playSample(voiceA)}
														disabled={isBusy || isAudioBusy}>
														<PlayCircle className="mr-2 h-4 w-4" />{" "}
														{isLoadingSample === voiceA
															? "Loading sample"
															: isPlaying === voiceA
																? "Playing"
																: "Play sample"}
													</Button>
												</div>
											</div>
											{/* voice b */}
											<div>
												<div className="py-2 pl-2 uppercase font-bold text-primary-foreground text-xs">
													Voice B
												</div>
												<Select value={voiceB} onValueChange={setVoiceB}>
													<SelectTrigger className="w/full" disabled={isBusy}>
														<SelectValue placeholder="Select Voice B" />
													</SelectTrigger>
													<SelectContent>
														{VOICE_OPTIONS.map(v => (
															<SelectItem key={v.id} value={v.id}>
																<div className="flex items-center justify-between w/full gap-3">
																	<div className="flex flex-col">
																		<span>{v.label}</span>
																	</div>
																	<button
																		type="button"
																		onMouseDown={e => e.preventDefault()}
																		onClick={e => {
																			e.stopPropagation();
																			void playSample(v.id);
																		}}
																		aria-label={`Play ${v.label} sample`}
																		className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100"></button>
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<div className="mt-4 md:max-w-full ">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => void playSample(voiceB)}
														disabled={isBusy || isAudioBusy}>
														<PlayCircle className="mr-2 h-4 w-4" />{" "}
														{isLoadingSample === voiceB
															? "Loading sample"
															: isPlaying === voiceB
																? "Playing"
																: "Play sample"}
													</Button>
												</div>
											</div>
										</div>
									)}
								</div>
							</FormAccordion>

							{/* Summary Length Selector */}
							{/* Summary Length Selector */}
							<FormAccordion
								value="summary-length"
								title="Audio Summary Duration"
								className="mt-6">
								<SummaryLengthSelector
									value={summaryLength}
									onChange={setSummaryLength}
									onLongOptionSelect={() => setShowLongWarning(true)}
									disabled={isBusy}
								/>
							</FormAccordion>

							<div className="my-8 w-full md:w-auto">
								<Button
									type="submit"
									disabled={!canSubmit}
									className="w-full md:w-auto px-8 py-6 rounded-xl bg-gradient-to-r from-emerald-400 via-[#22d3ee] to-violet-500 text-black font-bold text-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(74,222,128,0.5)] transition-all transform hover:scale-[1.01] border-none">
									{isCreating ? "Creating..." : "Generate summary"}
									<SparklesIcon className="w-5 h-5 text-black" />
								</Button>
							</div>
						</form>
						{error && <p className="text-red-500 mt-4">{error}</p>}
					</div>
				</div>

				{/* Sidebar Area (1/3) */}
				<div className="lg:col-span-1">
					<div className="sticky top-6">
						<UsageDisplay />
					</div>
				</div>
			</div>

			<LongEpisodeWarningDialog
				open={showLongWarning}
				onOpenChange={setShowLongWarning}
				remainingCredits={usage.limit - usage.count}
				onConfirm={() => {
					setSummaryLength("LONG");
					setShowLongWarning(false);
				}}
			/>

			<Dialog
				open={_showRestrictionDialog}
				onOpenChange={setShowRestrictionDialog}
				modal={true}>
				<DialogContent
					className="sm:max-w-md"
					onInteractOutside={e => e.preventDefault()}
					onEscapeKeyDown={e => e.preventDefault()}>
					<DialogHeader>
						<DialogTitle className="text-center text-xl">
							Episode Creation Limit Reached
						</DialogTitle>
						<DialogDescription className="text-center space-y-4">
							<p>
								You've reached your monthly limit of {usage.limit} episodes for your
								current membership plan.
							</p>
							<p className="font-medium">
								To create more episodes, you'll need to upgrade your membership to unlock
								higher limits and premium features.
							</p>
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-3 mt-6">
						<Button
							onClick={_handleUpgradeMembership}
							className="w-full"
							size="lg"
							variant="default">
							Upgrade Membership
						</Button>
						<Button
							onClick={_handleGoBack}
							variant="outline"
							className="w-full"
							size="lg">
							Go Back
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
