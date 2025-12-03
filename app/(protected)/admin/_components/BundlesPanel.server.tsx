import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import type { Bundle, Podcast } from "@/lib/types";
import BundlesPanelClient from "./BundlesPanel.client";

type BundleWithPodcastsRelation = Prisma.BundleGetPayload<{
	include: {
		bundle_podcast: {
			include: { podcast: true };
		};
	};
}>;

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

	// Transform Prisma types to client types, stripping binary fields and relations
	const bundles: (Bundle & { podcasts: Podcast[] })[] = bundlesDb.map(
		(b: BundleWithPodcastsRelation) => {
			// Extract scalar fields from bundle, excluding binary fields and the included relation
			const {
				image_data: _imgData,
				image_type: _imgType,
				bundle_podcast,
				...bundleScalars
			} = b;

			// Extract scalar fields from each podcast relation
			const podcasts: Podcast[] = bundle_podcast.map(bp => {
				// bp.podcast is the full Prisma Podcast type with relations from the include
				// Extract only scalar fields
				const podcast = bp.podcast;
				const {
					podcast_id,
					name,
					description,
					url,
					image_url,
					category,
					is_active,
					owner_user_id,
					created_at,
				} = podcast;
				return {
					podcast_id,
					name,
					description,
					url,
					image_url,
					category,
					is_active,
					owner_user_id,
					created_at,
				} as Podcast;
			});

			return {
				...bundleScalars,
				podcasts,
			} as Bundle & { podcasts: Podcast[] };
		}
	);

	// Extract scalar fields from podcasts, excluding relations
	const availablePodcasts: Podcast[] = podcastsDb.map(
		(p: Prisma.$PodcastPayload["scalars"]) => {
			// Extract only scalar fields from podcast
			const {
				podcast_id,
				name,
				description,
				url,
				image_url,
				category,
				is_active,
				owner_user_id,
				created_at,
			} = p;
			return {
				podcast_id,
				name,
				description,
				url,
				image_url,
				category,
				is_active,
				owner_user_id,
				created_at,
			} as Podcast;
		}
	);

	return <BundlesPanelClient bundles={bundles} availablePodcasts={availablePodcasts} />;
}
