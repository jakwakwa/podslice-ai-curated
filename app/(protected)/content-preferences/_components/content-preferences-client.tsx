"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useUserConfigStore } from "@/lib/stores/user-config-store";
import type { contentPreferencesContent } from "../content";

interface ContentPreferencesClientProps {
	content: typeof contentPreferencesContent;
}

export function ContentPreferencesClient({ content }: ContentPreferencesClientProps) {
	const { config, isLoading, loadConfig, updateConfig } = useUserConfigStore();

	const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
	const [_selectedFeeds, _setSelectedFeeds] = useState<string[]>([]);
	const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState("");
	const [api1Url, setApi1Url] = useState("");
	const [api2Url, setApi2Url] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	// Load config on mount
	useEffect(() => {
		loadConfig();
	}, [loadConfig]);

	// Populate form when config loads
	useEffect(() => {
		if (config) {
			// Parse comma-separated values or set empty arrays
			setSelectedTopics(config.topic ? config.topic.split(",") : []);
			// YouTube playlist URL is stored in rss_feed_url for the cron job
			setYoutubePlaylistUrl(config.rss_feed_url || "");
			setApi1Url(config.api1_url || "");
			setApi2Url(config.api2_url || "");
		}
	}, [config]);

	const handleTopicToggle = (topic: string) => {
		setSelectedTopics(prev => {
			if (prev.includes(topic)) {
				return prev.filter(t => t !== topic);
			}
			if (prev.length >= 2) {
				toast.warning("You can only select up to 2 topics");
				return prev;
			}
			return [...prev, topic];
		});
	};

	const validateUrl = (url: string): boolean => {
		if (!url) return true; // Empty is valid
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	};

	const validateYouTubeUrl = (url: string): boolean => {
		if (!url) return true; // Empty is valid
		try {
			const urlObj = new URL(url);
			// Check if it's a YouTube domain
			const isYouTube =
				urlObj.hostname === "youtube.com" ||
				urlObj.hostname === "www.youtube.com" ||
				urlObj.hostname === "m.youtube.com";
			if (!isYouTube) return false;

			// Accept playlist URLs (with list parameter)
			const hasPlaylist = urlObj.searchParams.has("list") || url.includes("/playlist");
			// Accept channel URLs (@handle or /channel/)
			const isChannel =
				urlObj.pathname.startsWith("/@") || urlObj.pathname.startsWith("/channel/");

			return hasPlaylist || isChannel;
		} catch {
			return false;
		}
	};

	const handleSave = async () => {
		// Validation
		if (selectedTopics.length === 0 && !youtubePlaylistUrl) {
			toast.error("Please select at least one topic or enter a YouTube playlist URL");
			return;
		}

		if (youtubePlaylistUrl && !validateYouTubeUrl(youtubePlaylistUrl)) {
			toast.error("Please enter a valid YouTube channel or playlist URL");
			return;
		}

		if (api1Url && !validateUrl(api1Url)) {
			toast.error("Please enter a valid URL for API 1");
			return;
		}

		if (api2Url && !validateUrl(api2Url)) {
			toast.error("Please enter a valid URL for API 2");
			return;
		}

		setIsSaving(true);
		try {
			// Check if YouTube URL changed
			const urlChanged = youtubePlaylistUrl !== (config?.rss_feed_url || "");

			const result = await updateConfig({
				topic: selectedTopics.length > 0 ? selectedTopics.join(",") : null,
				// YouTube playlist URL goes into rss_feed_url for the cron job
				rss_feed_url: youtubePlaylistUrl || null,
				api1_url: api1Url || null,
				api2_url: api2Url || null,
			});

			if ("error" in result) {
				toast.error(result.error);
				return;
			}

			// If YouTube URL was changed (not just added), clear old entries
			if (urlChanged && config?.rss_feed_url) {
				try {
					await fetch("/api/youtube-feed-entries", {
						method: "DELETE",
					});
				} catch (error) {
					console.error("Failed to clear old feed entries:", error);
					// Don't block the process if clearing fails
				}
			}

			// If YouTube URL was added or changed, trigger immediate fetch
			if (youtubePlaylistUrl && urlChanged) {
				toast.info("Fetching videos from your channel...");
				try {
					const cronResponse = await fetch("/api/cron/youtube-feed?force=1");
					if (cronResponse.ok) {
						const cronResult = await cronResponse.json();
						if (cronResult.success && cronResult.results?.length > 0) {
							const userResult = cronResult.results[0];
							if (userResult.newEntries > 0) {
								toast.success(
									`Successfully fetched ${userResult.newEntries} new video(s) from your channel!`
								);
							} else {
								toast.success("Channel synced - no new videos found");
							}
						}
					} else {
						toast.warning(
							"Preferences saved, but initial fetch failed. Will retry on next daily run."
						);
					}
				} catch (error) {
					console.error("Failed to trigger immediate fetch:", error);
					toast.warning(
						"Preferences saved, but initial fetch failed. Will retry on next daily run."
					);
				}
			}
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading && !config) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-secondary-foreground">Loading preferences...</div>
			</div>
		);
	}

	return (
		<div className="px-4 md:px-8 py-8 space-y-6">
			{/* Topics Section */}
			<Card className="p-6">
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-semibold text-primary-foreground-muted">
							{content.topics.label}
						</h3>
						<p className="text-sm text-foreground">
							{content.topics.helperText} ({selectedTopics.length} of 2 selected)
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{content.topics.options.map(topic => {
							const isSelected = selectedTopics.includes(topic);
							const isDisabled = !isSelected && selectedTopics.length >= 2;
							return (
								<div key={topic} className="flex items-center space-x-2">
									<Checkbox
										id={`topic-${topic}`}
										checked={isSelected}
										disabled={isDisabled}
										onCheckedChange={() => handleTopicToggle(topic)}
									/>
									<Label
										htmlFor={`topic-${topic}`}
										className={`cursor-pointer ${isDisabled ? "opacity-50" : ""}`}>
										{topic}
									</Label>
								</div>
							);
						})}
					</div>
				</div>
			</Card>

			{/* YouTube Playlist Section */}
			<Card className="p-6">
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-semibold text-primary-foreground-muted">
							{content.youtubeChannels.label}
						</h3>
						<p className="text-sm text-muted-foreground">
							{content.youtubeChannels.description}
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="youtube-playlist-url">Channel or Playlist URL</Label>
						<Input
							id="youtube-playlist-url"
							type="url"
							placeholder={content.youtubeChannels.placeholder}
							value={youtubePlaylistUrl}
							onChange={e => setYoutubePlaylistUrl(e.target.value)}
							className="max-w-2xl"
						/>
						<p className="text-xs text-muted-foreground">
							{content.youtubeChannels.helperText}
						</p>
					</div>
				</div>
			</Card>

			{/* Advanced Settings */}
			<Accordion
				type="single"
				collapsible
				className="w-full border-2 p-4 bg-primary rounded-xl border-sidebar-border">
				<AccordionItem value="advanced" className="border-none">
					<AccordionTrigger className="text-lg font-semibold">
						<h3 className="text-lg font-semibold text-primary-foreground-muted">
							{content.advanced.title}
						</h3>
					</AccordionTrigger>
					<AccordionContent>
						<Card className="p-6">
							<div className="space-y-4">
								<p className="text-sm text-muted-foreground">
									{content.advanced.description}
								</p>

								<div className="space-y-2">
									<Label htmlFor="api1-url">{content.advanced.lable_option_one}</Label>
									<Select>
										<SelectTrigger className="w-[180px]">
											<SelectValue placeholder="Theme" />
										</SelectTrigger>

										<SelectContent>
											{content.advanced.newsFeeds?.map(news => (
												<SelectItem key={`newsFeed-${news}`} value={news}>
													{news}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Label htmlFor="api1-url">{content.advanced.lable_option_two}</Label>
									<Select>
										<SelectTrigger className="w-[180px]">
											<SelectValue placeholder="Theme" />
										</SelectTrigger>

										<SelectContent>
											{content.advanced.newsFeeds?.map(news => (
												<SelectItem key={`newsFeed-${news}`} value={news}>
													{news}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</Card>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			{/* Save Button */}
			<div className="flex justify-end">
				<Button
					variant="default"
					onClick={handleSave}
					disabled={isSaving || isLoading}
					size="lg"
					className="w-full md:w-auto">
					{isSaving ? "Saving..." : content.buttons.save}
				</Button>
			</div>
		</div>
	);
}
