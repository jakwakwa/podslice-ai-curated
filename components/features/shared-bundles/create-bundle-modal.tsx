"use client";

import { useState } from "react";
import { Share2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { UserEpisode } from "@/lib/types";

type UserEpisodeListItem = UserEpisode & { signedAudioUrl?: string | null };

interface CreateBundleModalProps {
	currentEpisode?: UserEpisodeListItem;
	allUserEpisodes?: UserEpisodeListItem[];
	onSuccess?: (bundleId: string) => void;
}

export function CreateBundleModal({
	currentEpisode,
	allUserEpisodes = [],
	onSuccess,
}: CreateBundleModalProps) {
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<"details" | "episodes">("details");
	const [bundleName, setBundleName] = useState("");
	const [bundleDescription, setBundleDescription] = useState("");
	const [selectedEpisodes, setSelectedEpisodes] = useState<string[]>(
		currentEpisode ? [currentEpisode.episode_id] : []
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleReset = () => {
		setBundleName("");
		setBundleDescription("");
		setSelectedEpisodes(currentEpisode ? [currentEpisode.episode_id] : []);
		setStep("details");
		setIsSubmitting(false);
	};

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			// Reset form when closing
			handleReset();
		}
	};

	const handleNext = () => {
		if (step === "details" && bundleName.trim()) {
			setStep("episodes");
		}
	};

	const handleBack = () => {
		if (step === "episodes") {
			setStep("details");
		}
	};

	const toggleEpisode = (episodeId: string) => {
		setSelectedEpisodes((prev) =>
			prev.includes(episodeId)
				? prev.filter((id) => id !== episodeId)
				: [...prev, episodeId]
		);
	};

	const handleCreate = async () => {
		if (!bundleName.trim() || selectedEpisodes.length === 0) {
			toast.error("Please provide a bundle name and select at least one episode.");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/shared-bundles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: bundleName,
					description: bundleDescription,
					episode_ids: selectedEpisodes,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to create bundle");
			}

			const bundle = await response.json();

			toast.success(`Bundle "${bundleName}" created successfully!`);

			handleReset();
			setOpen(false);

			if (onSuccess) {
				onSuccess(bundle.shared_bundle_id);
			}
		} catch (error) {
			console.error("[CREATE_BUNDLE]", error);
			toast.error(error instanceof Error ? error.message : "Failed to create bundle");
		} finally {
			setIsSubmitting(false);
		}
	};

	const completedEpisodes = allUserEpisodes.filter(
		(ep) => ep.status === "COMPLETED"
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="default" size="sm">
					<Share2 className="mr-2 h-4 w-4" />
					Create Bundle
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>
						{step === "details" ? "Create Shared Bundle" : "Select Episodes"}
					</DialogTitle>
					<DialogDescription>
						{step === "details"
							? "Share a collection of your episodes with others. Start by naming your bundle."
							: `Select episodes to include in "${bundleName}". You can add up to 10 episodes.`}
					</DialogDescription>
				</DialogHeader>

				{step === "details" && (
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="bundle-name">Bundle Name *</Label>
							<Input
								id="bundle-name"
								placeholder="e.g., Best Marketing Episodes"
								value={bundleName}
								onChange={(e) => setBundleName(e.target.value)}
								maxLength={100}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="bundle-description">Description (Optional)</Label>
							<Textarea
								id="bundle-description"
								placeholder="Describe what this bundle is about..."
								value={bundleDescription}
								onChange={(e) => setBundleDescription(e.target.value)}
								rows={3}
								maxLength={500}
							/>
						</div>
					</div>
				)}

				{step === "episodes" && (
					<div className="py-4 max-h-[400px] overflow-y-auto">
						{completedEpisodes.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								You don't have any completed episodes yet.
							</p>
						) : (
							<div className="space-y-2">
								{completedEpisodes.map((episode) => (
									<div
										key={episode.episode_id}
										className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
									>
										<Checkbox
											id={`episode-${episode.episode_id}`}
											checked={selectedEpisodes.includes(episode.episode_id)}
											onCheckedChange={() => toggleEpisode(episode.episode_id)}
											disabled={
												!selectedEpisodes.includes(episode.episode_id) &&
												selectedEpisodes.length >= 10
											}
										/>
										<div className="flex-1 space-y-1">
											<Label
												htmlFor={`episode-${episode.episode_id}`}
												className="text-sm font-medium leading-none cursor-pointer"
											>
												{episode.episode_title}
											</Label>
											<p className="text-xs text-muted-foreground">
												{new Date(episode.created_at).toLocaleDateString()} •{" "}
												{episode.duration_seconds
													? `${Math.floor(episode.duration_seconds / 60)}m`
													: "Duration unknown"}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
						{selectedEpisodes.length >= 10 && (
							<p className="text-sm text-yellow-600 mt-4">
								Maximum of 10 episodes reached
							</p>
						)}
					</div>
				)}

				<DialogFooter>
					{step === "details" ? (
						<Button
							onClick={handleNext}
							disabled={!bundleName.trim()}
							className="w-full sm:w-auto"
						>
							Next: Select Episodes
						</Button>
					) : (
						<div className="flex gap-2 w-full sm:w-auto">
							<Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
								Back
							</Button>
							<Button
								onClick={handleCreate}
								disabled={selectedEpisodes.length === 0 || isSubmitting}
							>
								{isSubmitting ? "Creating..." : `Create Bundle (${selectedEpisodes.length})`}
							</Button>
						</div>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
