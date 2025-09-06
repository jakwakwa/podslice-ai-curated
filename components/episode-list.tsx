import { Download, Music } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Episode } from "@/lib/types"
import EpisodeCard from "./ui/episode-card"
import { H3 } from "./ui/typography"

interface EpisodeListProps {
	episodes: Episode[]
	onPlayEpisode?: (episodeId: string) => void
	playingEpisodeId?: string | null
	_href?: string // TODO: remove this
}

interface UserSubscription {
	plan_type: string
	status: string
}

const _formatDate = (date: Date | null | undefined) => {
	if (!date) return "N/A"
	return new Date(date).toLocaleString()
}

export const EpisodeList: React.FC<EpisodeListProps> = ({ episodes, onPlayEpisode, playingEpisodeId }) => {
	const [subscription, setSubscription] = useState<UserSubscription | null>(null)
	const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set())

	// Fetch user subscription status with Next.js caching (30 days)
	useEffect(() => {
		const fetchSubscription = async () => {
			try {
				const response = await fetch("/api/account/subscription", {
					next: {
						revalidate: 30 * 24 * 60 * 60, // 30 days in seconds
						tags: ["user-subscription"],
					},
				})
				if (response.ok) {
					const subData = await response.json()
					setSubscription(subData)
				}
			} catch (error) {
				console.error("Failed to fetch subscription:", error)
			}
		}

		fetchSubscription()
	}, [])

	// Check if user has tier 3 (CURATE_CONTROL) access
	const hasTier3Access = () => {
		if (!subscription) return false
		const planType = subscription.plan_type?.toLowerCase()
		return planType === "curate_control" || planType === "curate control"
	}

	// Check if episode is user-generated (has profile_id)
	const isUserGeneratedEpisode = (episode: Episode) => {
		return !!episode.profile_id
	}

	// Handle episode download
	const handleDownloadEpisode = async (episodeId: string, episodeTitle: string) => {
		if (downloadingEpisodes.has(episodeId)) return

		setDownloadingEpisodes(prev => new Set(prev).add(episodeId))

		try {
			const response = await fetch(`/api/episodes/${episodeId}/download`)

			if (!response.ok) {
				const error = await response.json()
				toast.error(error.error || "Failed to download episode")
				return
			}

			const { audio_url, filename } = await response.json()

			// Create download link
			const link = document.createElement("a")
			link.href = audio_url
			link.download = filename || `${episodeTitle}.mp3`
			link.target = "_blank"
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)

			toast.success(`Downloading "${episodeTitle}"`)
		} catch (error) {
			console.error("Download error:", error)
			toast.error("An error occurred while downloading the episode")
		} finally {
			setDownloadingEpisodes(prev => {
				const newSet = new Set(prev)
				newSet.delete(episodeId)
				return newSet
			})
		}
	}

	return (
		<Card className="rounded-3xl transition-all duration-200 text-card-foreground episode-card-wrapper px-0 md:min-h-[300px] w-ful">
			<H3>Bundle Roundup Epidsodes</H3>

			<CardContent>
				{episodes.length > 0 ? (
					<ul className="inline-block gap-1 w-full inline-flex flex-col gap-3">
						{episodes.map(episode => (
							<EpisodeCard
								key={episode.episode_id}
								as="li"
								imageUrl={episode.image_url || null}
								title={episode.title}
								description={episode.description}
								publishedAt={episode.published_at || new Date()}
								durationSeconds={episode.duration_seconds ?? null}
								actions={
									<>
										{episode.audio_url && onPlayEpisode && (
											<Button
												onClick={() => onPlayEpisode(episode.episode_id)}
												variant="play"
												size="play"
												className={playingEpisodeId === episode.episode_id ? "outline-accent outline-1" : ""}
											/>
										)}
										{hasTier3Access() && isUserGeneratedEpisode(episode) && episode.audio_url && (
											<Button
												onClick={() => handleDownloadEpisode(episode.episode_id, episode.title)}
												variant="outline"
												size="sm"
												disabled={downloadingEpisodes.has(episode.episode_id)}
												className="h-8">
												<Download className="w-4 h-4" />
												{downloadingEpisodes.has(episode.episode_id) ? "Downloading..." : "Download"}
											</Button>
										)}
									</>
								}
							/>
						))}
					</ul>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						<Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>No episodes available</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
