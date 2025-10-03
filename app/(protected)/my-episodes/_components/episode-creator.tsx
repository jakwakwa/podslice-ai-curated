"use client";

import { ChevronDown, ChevronRight, MessageSquareWarning, PlayCircle, YoutubeIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import ComponentSpinner from "@/components/ui/component-spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRICING_TIER } from "@/config/paddle-config";
import { VOICE_OPTIONS } from "@/lib/constants/voices";
import { getMaxDurationSeconds } from "@/lib/env";
import { useNotificationStore } from "@/lib/stores";

const EPISODE_LIMIT = PRICING_TIER[2].episodeLimit;
const YT_MAX_DURATION_SECONDS = getMaxDurationSeconds();

console.log("[DEBUG] Component initialized with YT_MAX_DURATION_SECONDS:", YT_MAX_DURATION_SECONDS);
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
		return host === "youtu.be" || host.endsWith(".youtu.be") || host === "youtube.com" || host.endsWith(".youtube.com");
	} catch {
		return false;
	}
}

export function EpisodeCreator() {
	const router = useRouter();
	const { resumeAfterSubmission } = useNotificationStore();

	const [youtubeUrl, setYouTubeUrl] = useState("");
	const [debouncedYoutubeUrl] = useDebounce(youtubeUrl, 500);

	const [youtubeUrlError, setYouTubeUrlError] = useState<string | null>(null);
	const [videoTitle, setVideoTitle] = useState<string | null>(null);
	const [videoDuration, setVideoDuration] = useState<number | null>(null);
	const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

	const [podcastName, setPodcastName] = useState("");

	// Generation options
	const [generationMode, setGenerationMode] = useState<"single" | "multi">("single");
	const [voiceA, setVoiceA] = useState<string>("Zephyr");
	const [voiceB, setVoiceB] = useState<string>("Kore");
	const [isPlaying, setIsPlaying] = useState<string | null>(null);
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

	const isBusy = isCreating || isFetchingMetadata;
	const isAudioPlaying = isPlaying !== null;

	const isDurationValid = videoDuration !== null && (maxDuration ? videoDuration <= maxDuration * 60 : videoDuration <= YT_MAX_DURATION_SECONDS);
	const canSubmit =
		Boolean(videoTitle) &&
		isYouTubeUrl(youtubeUrl) &&
		!isBusy &&
		isDurationValid &&
		videoDuration !== null &&
		(maxDuration ? videoDuration <= maxDuration * 60 : videoDuration <= YT_MAX_DURATION_SECONDS);

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
		console.log("[DEBUG] Duration validation useEffect triggered, videoDuration:", videoDuration, "maxDuration:", maxDuration);
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
		async function fetchMetadata() {
			console.log("[DEBUG] fetchMetadata called with URL:", debouncedYoutubeUrl);
			setYouTubeUrlError(null);
			if (isYouTubeUrl(debouncedYoutubeUrl)) {
				console.log("[DEBUG] URL is valid YouTube URL, fetching metadata...");
				setIsFetchingMetadata(true);
				setVideoTitle(null);
				setVideoDuration(null);
				try {
					const res = await fetch(`/api/youtube-metadata?url=${encodeURIComponent(debouncedYoutubeUrl)}`);
					console.log("[DEBUG] YouTube metadata API response status:", res.status);
					if (!res.ok) {
						throw new Error("Could not fetch video details. Please check the URL.");
					}
					const { title, duration } = await res.json();
					console.log("[DEBUG] Fetched metadata - title:", title, "duration:", duration, "seconds");
					console.log("[DEBUG] maxDuration (minutes):", maxDuration, "YT_MAX_DURATION_SECONDS fallback:", YT_MAX_DURATION_SECONDS);
					const maxSeconds = maxDuration ? maxDuration * 60 : YT_MAX_DURATION_SECONDS;
					console.log("[DEBUG] Using maxSeconds for validation:", maxSeconds);
					console.log("[DEBUG] Duration check:", duration > maxSeconds ? "TOO LONG" : "OK");
					setVideoTitle(title);
					setVideoDuration(duration);
				} catch (err) {
					console.error("[DEBUG] Error fetching metadata:", err);
					setYouTubeUrlError(err instanceof Error ? err.message : "An unknown error occurred.");
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
	}, [debouncedYoutubeUrl]);

	async function handleCreate() {
		console.log("[DEBUG] handleCreate called with canSubmit:", canSubmit);
		console.log("[DEBUG] handleCreate validation state:", {
			canSubmit,
			videoTitle: !!videoTitle,
			youtubeUrl,
			isYouTubeUrl: isYouTubeUrl(youtubeUrl),
			videoDuration,
			YT_MAX_DURATION_SECONDS,
			durationCheck: videoDuration !== null && videoDuration <= YT_MAX_DURATION_SECONDS,
		});

		if (!canSubmit) {
			console.log("[DEBUG] handleCreate blocked by canSubmit check");
			return;
		}

		// Additional explicit validation to prevent any bypass
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
			setError(`Video is too long. Please select a video that is ${maxMinutes} minutes or less. This video is ${Math.round(videoDuration / 60)} minutes long.`);
			return;
		}

		console.log("[DEBUG] handleCreate proceeding with episode creation");
		setIsCreating(true);
		setError(null);
		try {
			const payload = {
				title: videoTitle,
				youtubeUrl: youtubeUrl,
				podcastName: podcastName || undefined,
				generationMode,
				voiceA,
				voiceB,
			};
			const res = await fetch("/api/user-episodes/create-from-metadata", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error(await res.text());
			toast.message("We're processing your episode and will email you when it's ready.", { duration: Infinity, action: { label: "Dismiss", onClick: () => { } } });
			resumeAfterSubmission();
			router.push("/dashboard");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to start episode generation.");
			toast.error((err instanceof Error ? err.message : "Failed to start episode generation.") || "", { duration: Infinity, action: { label: "Dismiss", onClick: () => { } } });
		} finally {
			setIsCreating(false);
		}
	}

	async function playSample(voiceName: string) {
		try {
			setIsPlaying(voiceName);
			const cached = audioUrlCache[voiceName];
			let url = cached;
			if (!url) {
				const res = await fetch(`/api/tts/voice-sample?voice=${encodeURIComponent(voiceName)}`);
				if (!res.ok) throw new Error(await res.text());
				const blob = await res.blob();
				url = URL.createObjectURL(blob);
				setAudioUrlCache(prev => ({ ...prev, [voiceName]: url }));
			}
			const audio = new Audio(url);
			audio.onended = () => setIsPlaying(null);
			await audio.play();
		} catch (err) {
			setIsPlaying(null);
			console.error("Failed to play sample", err);
			toast.error("Could not load voice sample");
		}
	}

	// const hasReachedLimit = usage.count >= usage.limit;
	const handleUpgradeMembership = () => router.push("/manage-membership");
	const handleGoBack = () => router.back();

	return (
		<div className="w-full h-auto mb-0 px-4 py-4 md:px-8 lg:px-10 lg:py-6  rounded-lg border border-[#4a4e4e1a] shadow-lg">
			<div className="w-full flex flex-col gap-3 md:gap-8">
				<PageHeader title="Create Episode" className="pt-0" description="Generate a summary and audio version of a	 podcast episode from any YouTube video" />

				<CardContent>
					{isLoadingUsage ? (
						<ComponentSpinner isLabel={false} />
					) : (
						<form
							className="space-y-6 w-full"
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
							<div className="grid grid-cols-1 md:grid-cols-2 my-8 gap-4 mx-2 md:mx-4">
								<div className="space-y-2 md:col-span-2 lg:max-w-lg">
									<Label htmlFor="youtubeUrl">YouTube URL<span className="pl-2 text-[0.65rem] font-mono  font-medium text-[#1debaeb8]	">
										MAX {maxDuration}min duration
									</span></Label>

									<Input id="youtubeUrl" placeholder="https://www.youtube.com/..." value={youtubeUrl} onChange={e => setYouTubeUrl(e.target.value)} disabled={isBusy} required />
									{isFetchingMetadata && <ComponentSpinner />}
									{youtubeUrlError && (
										<p className="bg-[#21020621] px-2.5 py-1.5 text-[#ff99a7f9] text-xs mt-2 rounded-md outline-2 outline-[#e86e7f80]">
											{" "}
											<span className="flex gap-3">
												{" "}
												<MessageSquareWarning width={32} /> {youtubeUrlError}
											</span>
										</p>
									)}
								</div>

								{videoTitle && (
									<div className="bg-black/30 space-y-1 md:col-span-2 py-3 px-2 rounded-xl outline-2 outline-teal-500 shadow-lg max-w-sm  ">
										<p className=" font-bold text-[#e9dddfc7] flex text-xs items-center gap-2">
											<YoutubeIcon width={18} height={18} color="#fecdd7b5" />
											Youtube Video
										</p>
										<p className="text-[#eedde3d3] font-semibold text-xs">{videoTitle}</p>
										{videoDuration !== null && (
											<p className="text-xs text-[#c1f2ee78]">
												Duration: {Math.floor(videoDuration / 60)}m {videoDuration % 60}s
											</p>
										)}
									</div>
								)}
							</div>

							<div className="hidden not-only:grid-cols-1 gap-4">
								<div className="space-y-2">
									<Label htmlFor="podcastName">Podcast Name (optional)</Label>
									<Input id="podcastName" placeholder="Podcast show name" value={podcastName} onChange={e => setPodcastName(e.target.value)} disabled={isBusy} />
								</div>
							</div>

							<div className="space-y-6 border-2 border-[rgba(81,143,205,0.48)] rounded-xl md:rounded-4xl shadow-md px-4 md:px-10 pt-8 pb-6 bg-[#110d1737]">
								<div className="space-y-2">
									<Label>Voice Settings</Label>
									<div className="flex flex-row gap-3 mt-4">
										<Button type="button" variant={generationMode === "single" ? "default" : "outline"} onClick={() => setGenerationMode("single")} disabled={isBusy} className="px-4">
											Single speaker
										</Button>
										<Button type="button" variant={generationMode === "multi" ? "default" : "outline"} onClick={() => setGenerationMode("multi")} disabled={isBusy} className="px-4">
											Multi speaker
										</Button>
									</div>
									<button
										type="button"
										onClick={() => setShowTips(!showTips)}
										className="flex mt-4 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
										{showTips ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}💡 Helpful Tips
									</button>

									{showTips && (
										<div className="space-y-3 p-4 bg-[#00000074]/40	 rounded-xl border-1 border-[#151723af] ">
											<p className="text-xs font-semibold foreground/80">
												Both options can handle 90% of any youtube URL you provide! The quality of your generated episode depends on the content you choose to upload. These tips can help you decide if
												you're unsure:
											</p>
											<ul className="space-y-2 leading-relaxed text-foreground/80 text-xs mt-1">
												<li className="flex items-start gap-2">
													<span className="text-indigo-100">💡</span>
													<span>
														<strong className="text-indigo-300">Pro tip:</strong> If you're unsure, start with Single Speaker - it's our most reliable option for any content type
													</span>
												</li>
												<li className="flex my-1 content-center gap-2">
													<span className="text-orange-500">⏱️</span>
													<span>
														<strong className="text-teal-500 ">For videos over 2 hours:</strong> We recommend Single Speaker for faster processing and guaranteed success
													</span>

												</li>
												<li className="flex items-start gap-2">
													<span className="text-blue-500">⚡</span>
													<span>
														<strong className="text-teal-500">Single Speaker</strong> processes faster and is ideal for solo presentations, tutorials, or monologues
													</span>
												</li>
												<li className="flex items-start gap-2">
													<span className="text-green-200">🎙️</span>
													<span>
														<strong className="text-teal-500">Multi Speaker</strong> results will be generated into two speaker conversational podcast syled episode. For more engaging information
														consumption. May not be suite for all types of content.
													</span>
												</li>

												<li className="flex items-start gap-2">
													<span className="text-purple-500">🎯</span>
													<span>
														<strong className="text-teal-500">Best results come from:</strong> Clear audio, minimal background noise, and well-structured content
													</span>
												</li>
												<li className="flex items-start gap-2">
													<span className="text-red-500">⚠️</span>
													<span>
														<strong className="text-amber-400">Avoid:</strong> Music-heavy content, very fast speech, or videos with poor audio quality
													</span>
												</li>
											</ul>
										</div>
									)}
								</div>

								{generationMode === "multi" && (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<div className="py-2 pl-2 uppercase font-bold text-[#79c4ca] text-xs">Voice A</div>
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
																	className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100"></button>
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<div className="mt-2">
												<Button type="button" variant="outline" size="sm" onClick={() => void playSample(voiceA)} disabled={isBusy || isAudioPlaying}>
													<PlayCircle className="mr-2 h-4 w-4" /> {isPlaying === voiceA ? "Playing" : "Play sample"}
												</Button>
											</div>
										</div>
										<div>
											<div className="py-2 pl-2 uppercase font-bold text-[#af80f7] text-xs">Voice B</div>
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
																	{/* <span className="text-xs opacity-75">{v.sample}</span> */}
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
											<div className="mt-2">
												<Button type="button" variant="outline" size="sm" onClick={() => void playSample(voiceB)} disabled={isBusy || isAudioPlaying}>
													<PlayCircle className="mr-2 h-4 w-4" /> {isPlaying === voiceB ? "Playing" : "Play sample"}
												</Button>
											</div>
										</div>
									</div>
								)}
							</div>

							<Button type="submit" variant="secondary" disabled={!canSubmit} className="w-full p-4">
								{isCreating ? "Creating..." : "Create & Generate"}
							</Button>
						</form>
					)}
					{error && <p className="text-red-500 mt-4">{error}</p>}
				</CardContent>
			</div>

			<Dialog open={showRestrictionDialog} onOpenChange={() => { }} modal={true}>
				<DialogContent className="sm:max-w-md" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
					<DialogHeader>
						<DialogTitle className="text-center text-xl">Episode Creation Limit Reached</DialogTitle>
						<DialogDescription className="text-center space-y-4">
							<p>You've reached your monthly limit of {usage.limit} episodes for your current membership plan.</p>
							<p className="font-medium">To create more episodes, you'll need to upgrade your membership to unlock higher limits and premium features.</p>
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-3 mt-6">
						<Button onClick={handleUpgradeMembership} className="w-full" size="lg" variant={"link"}>
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
