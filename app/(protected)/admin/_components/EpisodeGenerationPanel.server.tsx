import { prisma } from "@/lib/prisma"
import type { Bundle, Podcast } from "@/lib/types"
import EpisodeGenerationPanelClient from "./EpisodeGenerationPanel.client"

export default async function EpisodeGenerationPanel() {
	try {
		const bundlesDb = await prisma.bundle.findMany({
			where: { is_active: true },
			include: { bundle_podcast: { include: { podcast: true } } },
			orderBy: { created_at: "desc" },
		})
		const bundles = bundlesDb.map(b => ({
			...(b as unknown as Bundle),
			podcasts: b.bundle_podcast.map(bp => bp.podcast as unknown as Podcast),
		})) as (Bundle & { podcasts: Podcast[]; canInteract?: boolean; lockReason?: string | null; min_plan?: string })[]
		return <EpisodeGenerationPanelClient bundles={bundles} />
	} catch {
		return <EpisodeGenerationPanelClient bundles={[]} />
	}
}
