"use client"

import { Lock, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AppSpinner } from "@/components/ui/app-spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Bundle, Podcast } from "@/lib/types"
import PanelHeader from "./PanelHeader"
import Stepper from "./stepper"

type BundleWithPodcasts = (Bundle & { podcasts: Podcast[] }) & { canInteract?: boolean; lockReason?: string | null }

export default function EpisodeGenerationPanelClient({ bundles }: { bundles: BundleWithPodcasts[] }) {
	const [selectedBundleId, setSelectedBundleId] = useState<string>("")
	const [selectedPodcastId, setSelectedPodcastId] = useState<string>("")
	const [youtubeUrl, setYoutubeUrl] = useState("")
	const [isLoading, setIsLoading] = useState(false)

	const selectedBundle = bundles.find(b => b.bundle_id === selectedBundleId)
	const selectedPodcast = selectedBundle?.podcasts.find(p => p.podcast_id === selectedPodcastId)

	const hasBundles = bundles && bundles.length > 0

	const isYouTubeUrl = (url: string) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url.trim())

	useEffect(() => {
		if (!selectedBundle) {
			setSelectedPodcastId("")
			return
		}
		const podcastIds = selectedBundle.podcasts.map(p => p.podcast_id)
		if (!podcastIds.includes(selectedPodcastId)) {
			setSelectedPodcastId(podcastIds[0] ?? "")
		}
	}, [selectedPodcastId, selectedBundle])

	if (!hasBundles) {
		return (
			<div className="p-6">
				<Card>
					<PanelHeader title="No bundles found" description="Create a bundle before generating or uploading episodes." />
					<CardContent>
						<Button asChild variant="default">
							<Link href="/admin/bundles">Create your first bundle</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const generateEpisode = async () => {
		if (!(selectedBundleId && selectedPodcastId && youtubeUrl.trim())) {
			toast.error("Bundle, podcast and YouTube URL are required")
			return
		}
		if (!isYouTubeUrl(youtubeUrl)) {
			toast.error("Enter a valid YouTube URL")
			return
		}
		setIsLoading(true)
		try {
			const resp = await fetch("/api/admin/generate-bundle-episode", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bundleId: selectedBundleId, podcastId: selectedPodcastId, youtubeUrl: youtubeUrl.trim() }),
			})
			if (!resp.ok) {
				const errorText = await resp.text()
				throw new Error(errorText || "Failed to start generation")
			}
			toast.success("Episode generation started")
			setSelectedBundleId("")
			setSelectedPodcastId("")
			setYoutubeUrl("")
		} catch (error) {
			console.error("Failed to generate episode:", error)
			toast.error(error instanceof Error ? error.message : "Failed to start generation")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="space-y-6">
			{/* Step 1: Select bundle (always visible) */}
			<Card>
				<PanelHeader
					title={
						<div className="flex items-center gap-2">
							<Stepper step={1} /> Select Bundle
						</div>
					}
					description="Choose which curated bundle to generate an episode for"
				/>
				<CardContent className="p-4">
					<Select value={selectedBundleId} onValueChange={setSelectedBundleId}>
						<SelectTrigger>
							<SelectValue placeholder="Select a bundle..." />
						</SelectTrigger>
						<SelectContent>
							{bundles.map(b => (
								<SelectItem key={b.bundle_id} value={b.bundle_id} disabled={b.canInteract === false}>
									{b.name} ({b.podcasts.length} shows){b.canInteract === false ? " – Locked" : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{selectedBundle && selectedBundle.canInteract === false && (
						<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
							<Lock className="w-3 h-3" />
							<span>{selectedBundle.lockReason || "This bundle requires a higher plan."}</span>
						</div>
					)}
					{selectedBundle && (
						<div className="mt-4 p-4 bg-muted rounded-lg">
							<h4 className="font-semibold mb-2">{selectedBundle.name}</h4>
							<p className="text-sm text-muted-foreground mb-3">{selectedBundle.description}</p>
							<div className="flex flex-wrap gap-2">
								{selectedBundle.podcasts.map(p => (
									<Badge key={p.podcast_id} variant="outline">
										{p.name}
									</Badge>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Step 1.5: Select podcast (only when a bundle is selected) */}
			{selectedBundleId && selectedBundle && (
				<Card>
					<PanelHeader
						title={
							<div className="flex items-center gap-2">
								<Stepper step={2} /> Select Podcast for Episode
							</div>
						}
						description="Choose which podcast within the bundle this episode belongs to"
					/>
					<CardContent className="p-4 space-y-2">
						<Select value={selectedPodcastId} onValueChange={setSelectedPodcastId}>
							<SelectTrigger>
								<SelectValue placeholder="Select a podcast..." />
							</SelectTrigger>
							<SelectContent>
								{selectedBundle.podcasts.map(p => (
									<SelectItem key={p.podcast_id} value={p.podcast_id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{selectedPodcast && (
							<div className="mt-2">
								<Badge variant="secondary">
									Selected: {selectedPodcast.name}
								</Badge>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Step 2: Episode details (only when a bundle is selected) */}
			{/* Step 3 removed: Title/Description/Image now auto-fetched from YouTube */}

			{/* Step 3: Method + contextual fields (only when a bundle is selected) */}
			{selectedBundleId && (
				<Card>
					<PanelHeader
						title={
							<div className="flex items-center gap-2">
								<Stepper step={3} /> Provide YouTube URL
							</div>
						}
						description="Paste the YouTube video to generate a curated episode. Title, image & description auto-populate."
					/>
					<CardContent className="p-4 space-y-4">
						<div>
							<Label htmlFor="youtubeUrl">YouTube URL *</Label>
							<Input id="youtubeUrl" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
						</div>
						<div className="flex gap-2">
							<Button type="button" variant="outline" size="sm" disabled className="cursor-not-allowed opacity-50">
								Upload MP3 (disabled)
							</Button>
							<Button type="button" variant="outline" size="sm" disabled className="cursor-not-allowed opacity-50">
								Direct Link (disabled)
							</Button>
						</div>
						<CardContent className="pt-2 p-0">
							<Button
								onClick={generateEpisode}
								disabled={isLoading || !selectedBundleId || !selectedPodcastId || !youtubeUrl.trim()}
								className="w-full"
								size="lg"
								variant="default">
								{isLoading ? (
									<>
										<AppSpinner size="sm" color="default" className="mr-2" />
										Generating...
									</>
								) : (
									<>
										<Sparkles className="w-4 h-4 mr-2" />
										Generate Episode
									</>
								)}
							</Button>
						</CardContent>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
