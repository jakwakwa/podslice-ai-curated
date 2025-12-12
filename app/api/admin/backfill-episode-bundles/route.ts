import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest) {
	try {
		await requireAdmin();

		// Find all episodes without bundle_id
		const episodesWithoutBundle = await prisma.episode.findMany({
			where: {
				bundle_id: null,
			},
			include: {
				podcast: {
					include: {
						bundle_podcast: {
							where: {
								bundle: { is_active: true },
							},
							include: {
								bundle: true,
							},
							take: 1, // Just get the first active bundle
						},
					},
				},
			},
		});

		let updated = 0;
		let skipped = 0;
		const updatedEpisodeIds: string[] = [];

		for (const episode of episodesWithoutBundle) {
			const bundlePodcast = episode.podcast.bundle_podcast[0];
			if (bundlePodcast) {
				await prisma.episode.update({
					where: { episode_id: episode.episode_id },
					data: { bundle_id: bundlePodcast.bundle_id },
				});
				updatedEpisodeIds.push(episode.episode_id);
				updated++;
				console.log(
					`[BACKFILL] Updated episode ${episode.episode_id} with bundle_id: ${bundlePodcast.bundle_id}`
				);
			} else {
				skipped++;
				console.log(
					`[BACKFILL] Skipped episode ${episode.episode_id} - podcast not in any bundle`
				);
			}
		}

		// Invalidate cache for curated episodes
		if (updated > 0) {
			try {
				await prisma.$accelerate.invalidate({
					tags: ["curated_episodes"],
				});
				console.log("[BACKFILL] Invalidated curated_episodes cache");
			} catch (cacheError) {
				console.warn("[BACKFILL] Failed to invalidate cache:", cacheError);
			}
		}

		return NextResponse.json({
			success: true,
			updated,
			skipped,
			total: episodesWithoutBundle.length,
			updatedEpisodeIds: updatedEpisodeIds.slice(0, 10), // Return first 10 for debugging
		});
	} catch (error) {
		console.error("Backfill error:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
