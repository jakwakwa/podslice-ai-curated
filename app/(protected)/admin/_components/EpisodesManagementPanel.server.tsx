import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Bundle, Episode, Podcast } from "@/lib/types";
import EpisodesManagementPanelClient from "./EpisodesManagementPanel.client";

export default async function EpisodesManagementPanel() {
	await requireAdmin();

	const [episodes, bundles] = await Promise.all([
		prisma.episode.findMany({
			include: {
				podcast: true,
				bundle: {
					select: {
						bundle_id: true,
						name: true,
					},
				},
			},
			orderBy: { created_at: "desc" },
		}),
		prisma.bundle.findMany({
			where: { is_active: true },
			select: {
				bundle_id: true,
				name: true,
			},
			orderBy: { name: "asc" },
		}),
	]);

	const shapedEpisodes = episodes.map(e => ({
		...(e as unknown as Episode),
		podcast: e.podcast as unknown as Podcast,
		bundle: e.bundle
			? {
					bundle_id: e.bundle.bundle_id,
					name: e.bundle.name,
				}
			: null,
	}));

	const shapedBundles = bundles as unknown as Bundle[];

	return (
		<EpisodesManagementPanelClient episodes={shapedEpisodes} bundles={shapedBundles} />
	);
}
