"use client";

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
import { LongEpisodeWarningDialog } from "@/components/features/episode-generation/long-episode-warning-dialog";
import { SummaryLengthSelector } from "@/components/features/episode-generation/summary-length-selector";
import SectionHeader from "@/components/shared/section-header";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRICING_TIER } from "@/config/paddle-config";
import { VOICE_OPTIONS } from "@/lib/constants/voices";
import { getMaxDurationSeconds } from "@/lib/env";
import { useNotificationStore } from "@/lib/stores";
import type { SummaryLengthOption } from "@/lib/types/summary-length";

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

export function EpisodeCreator() {
	const router = useRouter();
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
	// Generation options
	const [generationMode, setGenerationMode] = useState<"single" | "multi">("single");
	const [voiceA, setVoiceA] = useState<string>("Rasalgethi");
	const [voiceB, setVoiceB] = useState<string>("Sulafat");
	const [isPlaying, setIsPlaying] = useState<string | null>(null);
	const [isLoadingSample, setIsLoadingSample] = useState<string | null>(null);
	const [audioUrlCache, setAudioUrlCache] = useState<Record<string, string>>({});
	const [maxDuration, setMaxDuration] = useState<number | null>(120); // Default to 120 minutes
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [usage, setUsage] = useState({ count: 0, limit: EPISODE_LIMIT });
	const [isLoadingUsage, setIsLoadingUsage] = useState(true);

	// Restriction dialog state
	const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);

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
	const handleUpgradeMembership = () => router.push("/manage-membership");
	const handleGoBack = () => router.back();

	return (
		<div className="w-full h-auto mb-0 px-8 py-0 md:px-8 md:pt-8 lg:px-10 mr-0 lg:pb-12 lg:mb-0 rounded-none shadow-lg rounded-b-md overflow-hidden">
			<SectionHeader
				title="Generate your summary"
				description="Summarise long-form podcasts, lectures or tutorials from youtube into concise, AI produced and analysed, generated audio and text summaries. Our Ai will help you understand the core concepts with an easy-to-listen to audible overview and text summary with a list of important key concepts"
			/>
			<div className="w-full flex flex-col gap-3 md:gap-8 md:w-full  p-0 md:min-w-full md:max-w-full">
				<div className="w-full py-8 px-0 md:p-0 ">
					{/* <ComponentSpinner isLabel={false} /> */}

					<div className="w-full flex flex-col px-0 md:px-4  gap-4">
						<div className="border-1 border-border bg-sidebar/20 rounded-3xl text-xs shadow-md p-8">
							<Label className="mb-2 md:mb-4">Pick a Summary Type:</Label>
							{creatorMode === "youtube"
								? "Instructions: To find the youtube link, go to the video, click the share button below the video, copy the link that pop-up and paste it over here."
								: "Want to catch up on the latest news? Select your desired sources and topics. Our AI will get to work and create a custom summary (both audio and text) just for you."}
							<div className="w-[300px] mt-5 flex flex-row items-center justify-start gap-2 ">
								<Button
									type="button"
									variant={creatorMode === "youtube" ? "default" : "outline"}
									onClick={() => setCreatorMode("youtube")}
									disabled={isBusy}>
									podcast summary
								</Button>
								<Button
									type="button"
									variant={creatorMode === "news" ? "default" : "outline"}
									onClick={() => setCreatorMode("news")}
									disabled={isBusy}>
									Reaseach summary
								</Button>
							</div>
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
								<div className=" my-8 gap-4 mx-0 md:mx-0 border-1 border-border rounded-3xl  shadow-md p-8">
									<div className="space-y-2 md:w-full md:min-w-fit">
										<Label htmlFor="youtubeUrl">
											Link to podcast episode ( YouTube only )
										</Label>
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type="button"
													className="flex text-xs flex-row items-center text-teal-200/80 py-1 gap-2">
													<HelpCircle
														color={"#39c0b5e2"}
														className="text-xs  top-7 md:top-3 right-4 text-white"
														size={16}
													/>
													<span className="text-xs">
														Need help finding the link you need?
													</span>
												</button>
											</TooltipTrigger>
											<span className="hidden">Hover</span>
											<TooltipContent className="bg-teal-900 backdrop-blur-sm flex flex-col items-center justify-center shadow-lg shadow-gray-950/90">
												<p className="text-sm text-whitw cursor-default font-bold">
													Quick Guide: How to Find and Paste YouTube Link
												</p>
												<Image
													width={1000}
													height={1000}
													src="/how-to-get-link.gif"
													alt="How to get the link"
													className="w-full h-full object-cover my-2 border-1 border-border rounded-md max-w-lg object-center"
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
													className="text-xs  top-7 md:top-3 right-4 text-violet-400"
													size={16}
												/>
												<span className="text-xs text-indigo-200">
													<span className="font-bold text-violet-300">Quick Review:</span>{" "}
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

							{creatorMode === "news" && (
								<div className="flex flex-row flex-wrap my-8 gap-4 mx-2 md:mx-4 min-w-full md:gap-4 ">
									<div className="border-1 border-border rounded-3xl  shadow-md p-8 space-y-2 md:col-span-2 lg:min-w-full text-sm">
										<Label>Sources</Label>
										<span className="text-foreground/70">
											Pick your sources, or leave it to the Ai to decide
										</span>
										<div className="flex w-full mt-4 justify-start items-start flex-wrap gap-4">
											{NEWS_SOURCES.map(s => {
												const active = selectedSources.includes(s.id);
												return (
													<div key={s.id}>
														<Button
															key={s.id}
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
																	<span className="inline-flex items-center">
																		<InfoIcon
																			className="text-xs  top-7 md:top-3 right-4"
																			size={16}
																		/>
																		<span className="hidden">Hover</span>
																	</span>
																</TooltipTrigger>
																<TooltipContent className="bg-background">
																	<p className="text-sm text-black cursor-default ">
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

									<div className="mt-4 md:col-span-2 lg:min-w-full w-full border-1 border-border rounded-3xl  shadow-md p-8">
										<Label htmlFor="selectedTopicId">Topic</Label>
										<Input
											placeholder="Research any topic..."
											id="selectedTopicId"
											onChange={e => setSelectedTopic(e.target.value)}
											value={selectedTopic}
											disabled={isBusy}
											required
										/>
									</div>
								</div>
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

							<div className="space-y-6 border-1 rounded-xl md:rounded-4xl w-full md:max-w-full shadow-md px-0 md:px-10 pt-8 pb-12 bg-[#110d1712] md:min-w-full ">
								<div className="py-0 px-4 md:p-0 ">
									<div className="w-[250px] flex flex-col gap-0 md:min-w-full ">
										<Label>Voice Settings</Label>
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
											className="flex mt-4 items-center gap-2 font-medium text-cyan-200/80 hover:text-foreground transition-colors mb-3 text-[0.6rem] uppercase ">
											{showTips ? (
												<ChevronDown className="h-4 w-4 md:max-w-full " />
											) : (
												<ChevronRight className="h-4 w-4" />
											)}
											💡 Helpful Tips
										</button>

										{showTips && (
											<div className="space-y-3 p-4 bg-secondary shadow-sm mb-4	 rounded-xl w-full min-w-full md:max-w-full md:min-w-full ">
												<p className="text-xs font-semibold foreground/80">
													Both options can handle 90% of any youtube URL you provide! The
													quality of your generated episode depends on the content you
													choose to upload. These tips can help you decide if you're
													unsure:
												</p>
												<ul className="space-y-2 leading-relaxed text-primary-foreground text-xs mt-1 md:max-w-full ">
													<li className="flex items-start gap-2">
														<span className="text-indigo-300">💡</span>
														<span>
															<strong className="text-cyan-200">Pro tip:</strong> If
															you're unsure, start with Single Speaker - it's our most
															reliable option for any content type
														</span>
													</li>
													<li className="flex my-1 content-center gap-2">
														<span className="text-cyan-500">⏱️</span>
														<span>
															<strong className="text-cyan-300 ">
																For videos over 2 hours:
															</strong>{" "}
															We recommend Single Speaker for faster processing and
															guaranteed success
														</span>
													</li>
													<li className="flex items-start gap-2">
														<span className="text-blue-500">⚡</span>
														<span>
															<strong className="text-cyan-300">Single Speaker</strong>{" "}
															processes faster and is ideal for solo presentations,
															tutorials, or monologues
														</span>
													</li>
													<li className="flex items-start gap-2">
														<span className="text-green-200">🎙️</span>
														<span>
															<strong className="text-cyan-300">Multi Speaker</strong>{" "}
															results will be generated into two speaker conversational
															podcast syled episode. For more engaging information
															consumption. May not be suite for all types of content.
														</span>
													</li>

													<li className="flex items-start gap-2">
														<span className="text-purple-500">🎯</span>
														<span>
															<strong className="text-cyan-300">
																Best results come from:
															</strong>{" "}
															Clear audio, minimal background noise, and well-structured
															content
														</span>
													</li>
													<li className="flex items-start gap-2">
														<span className="text-red-500">⚠️</span>
														<span>
															<strong className="text-amber-400">Avoid:</strong>{" "}
															Music-heavy content, very fast speech, or videos with poor
															audio quality
														</span>
													</li>
												</ul>
											</div>
										)}
									</div>

									{generationMode === "single" && (
										<div className="space-y-4 md:max-w-full ">
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
															<SelectItem key={v.name} value={v.name}>
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
															<SelectItem key={v.name} value={v.name}>
																<div className="flex items-center justify-between w/full gap-3 ">
																	<div className="flex flex-col">
																		<span>{v.label}</span>
																	</div>
																	<button
																		type="button"
																		onMouseDown={e => e.preventDefault()}
																		onClick={e => {
																			e.stopPropagation();
																			void playSample(v.name);
																		}}
																		aria-label={`Play ${v.name} sample`}
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
															<SelectItem key={v.name} value={v.name}>
																<div className="flex items-center justify-between w/full gap-3">
																	<div className="flex flex-col">
																		<span>{v.label}</span>
																	</div>
																	<button
																		type="button"
																		onMouseDown={e => e.preventDefault()}
																		onClick={e => {
																			e.stopPropagation();
																			void playSample(v.name);
																		}}
																		aria-label={`Play ${v.name} sample`}
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
							</div>

							{/* Summary Length Selector */}
							<div className=" border-1 rounded-xl md:rounded-4xl w-full md:max-w-full shadow-md px-4 md:px-10 pt-8 pb-12 bg-[#110d1712] md:min-w-full mt-6">
								<SummaryLengthSelector
									value={summaryLength}
									onChange={setSummaryLength}
									onLongOptionSelect={() => setShowLongWarning(true)}
									disabled={isBusy}
								/>
							</div>

							<div className="flex  w-fit mt-6 flex-col px-0 md:px-4 border-1 border-gray-900/9	0 rounded-3xl  shadow-md p-0 md:p-3 gap-4">
								<Button
									type="submit"
									variant="secondary"
									disabled={!canSubmit}
									className="w-full p-0">
									{isCreating ? "Creating..." : "Generate summary"}
									<SparklesIcon />
								</Button>
							</div>
						</form>
						{error && <p className="text-red-500 mt-4">{error}</p>}
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

			<Dialog open={showRestrictionDialog} onOpenChange={() => {}} modal={true}>
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
							onClick={handleUpgradeMembership}
							className="w-full"
							size="lg"
							variant={"link"}>
							Upgrade Membership
						</Button>
						<Button onClick={handleGoBack} variant="outline" className="w-full" size="lg">
							Go Back
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
