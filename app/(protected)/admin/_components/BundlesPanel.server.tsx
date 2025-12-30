import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Bundle, Podcast } from "@/lib/types";
import BundlesPanelClient from "./BundlesPanel.client";

export default async function BundlesPanel() {
	await requireAdmin();

	const [bundlesDb, podcastsDb] = await Promise.all([
		prisma.bundle.findMany({
			include: {
				bundle_podcast: {
					include: { podcast: true },
				},
			},
			orderBy: { created_at: "desc" },
		}),
		prisma.podcast.findMany({
			where: { is_active: true },
			orderBy: { name: "asc" },
			cacheStrategy: {
				swr: 60,
				ttl: 180,
				tags: ["Podcast_List_in_Bundles_Panel_in_Admin"],
			},
		}),
	]);

	const bundles: (Bundle & { podcasts: Podcast[] })[] = bundlesDb.map(b => {
		// Strip binary fields before passing to the client
		const {
			image_data: _imgData,
			image_type: _imgType,
			...rest
		} = b as unknown as Record<string, unknown>;
		return {
			...(rest as unknown as Bundle),
			podcasts: b.bundle_podcast.map(bp => bp.podcast as unknown as Podcast),
		};
	});
	const availablePodcasts = podcastsDb as unknown as Podcast[];

	return <BundlesPanelClient bundles={bundles} availablePodcasts={availablePodcasts} />;
}
