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
	const [selectedFeeds, setSelectedFeeds] = useState<string[]>([]);
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
			setSelectedFeeds(config.rss_feed_url ? config.rss_feed_url.split(",") : []);
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

	const handleFeedToggle = (feed: string) => {
		setSelectedFeeds(prev => {
			if (prev.includes(feed)) {
				return prev.filter(f => f !== feed);
			}
			if (prev.length >= 2) {
				toast.warning("You can only select up to 2 RSS feeds");
				return prev;
			}
			return [...prev, feed];
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

	const handleSave = async () => {
		// Validation
		if (selectedTopics.length === 0 && selectedFeeds.length === 0) {
			toast.error("Please select at least one topic or RSS feed");
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
			const result = await updateConfig({
				topic: selectedTopics.length > 0 ? selectedTopics.join(",") : null,
				rss_feed_url: selectedFeeds.length > 0 ? selectedFeeds.join(",") : null,
				api1_url: api1Url || null,
				api2_url: api2Url || null,
			});

			if ("error" in result) {
				toast.error(result.error);
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
		<div className="px-4 md:px-8 pb-8 space-y-6">
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

			{/* RSS Feeds Section */}
			<Card className="p-6">
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-semibold text-primary-foreground-muted">
							{content.rssFeeds.label}
						</h3>
						<p className="text-sm text-muted-foreground">
							{content.rssFeeds.helperText} ({selectedFeeds.length} of 2 selected)
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{content.rssFeeds.options.map(feed => {
							const isSelected = selectedFeeds.includes(feed);
							const isDisabled = !isSelected && selectedFeeds.length >= 2;
							return (
								<div key={feed} className="flex items-center space-x-2">
									<Checkbox
										id={`feed-${feed}`}
										checked={isSelected}
										disabled={isDisabled}
										onCheckedChange={() => handleFeedToggle(feed)}
									/>
									<Label
										htmlFor={`feed-${feed}`}
										className={`cursor-pointer ${isDisabled ? "opacity-50" : ""}`}>
										{feed}
									</Label>
								</div>
							);
						})}
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
