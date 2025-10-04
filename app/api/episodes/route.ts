// @ts-nocheck

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // Use the global client
import { withDatabaseTimeout } from "../../../lib/utils";

// Force this API route to always execute on each request (no ISR / caching)
export const dynamic = "force-dynamic";

// export const dynamic = "force-dynamic"
export const maxDuration = 60; // 1 minute for complex database queries

export async function GET(request: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get bundle type filter from query params (all, curated, shared)
		const { searchParams } = new URL(request.url);
		const bundleType = searchParams.get("bundleType") || "all";

		// Episodes should relate to podcasts; visibility via user's selected bundle membership
		const profile = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId, is_active: true },
			include: { 
				selectedBundle: { include: { bundle_podcast: true } },
				selectedSharedBundle: { include: { episodes: { where: { is_active: true } } } }
			},
		});

		const podcastIdsInSelectedBundle = profile?.selectedBundle?.bundle_podcast.map(bp => bp.podcast_id) ?? [];
		const sharedBundleEpisodeIds = profile?.selectedSharedBundle?.episodes.map(e => e.episode_id) ?? [];

		// Build the where clause based on bundle type filter
		let whereClause: any = {
			OR: [
				{ userProfile: { user_id: userId } },
			],
		};

		// Apply bundle type filtering
		if (bundleType === "curated") {
			// Only show episodes from admin-curated bundles
			if (podcastIdsInSelectedBundle.length > 0) {
				whereClause.OR.push({ podcast_id: { in: podcastIdsInSelectedBundle } });
			}
			if (profile?.selectedBundle?.bundle_id) {
				whereClause.OR.push({ bundle_id: profile.selectedBundle.bundle_id });
			}
		} else if (bundleType === "shared") {
			// Only show episodes from shared bundles
			if (sharedBundleEpisodeIds.length > 0) {
				whereClause.OR.push({ episode_id: { in: sharedBundleEpisodeIds } });
			}
		} else {
			// Show all episodes (default: all)
			if (podcastIdsInSelectedBundle.length > 0) {
				whereClause.OR.push({ podcast_id: { in: podcastIdsInSelectedBundle } });
			}
			if (profile?.selectedBundle?.bundle_id) {
				whereClause.OR.push({ bundle_id: profile.selectedBundle.bundle_id });
			}
			if (sharedBundleEpisodeIds.length > 0) {
				whereClause.OR.push({ episode_id: { in: sharedBundleEpisodeIds } });
			}
		}

		const episodes = await withDatabaseTimeout(
			prisma.episode.findMany({
				where: whereClause,
				include: {
					podcast: true,
					userProfile: true,
				},
				orderBy: { created_at: "desc" },
			})
		);

		// Explicitly disable any downstream caching; add timestamp header to bust CDN layers if any
		return NextResponse.json(episodes, {
			headers: {
				"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
				Pragma: "no-cache",
				Expires: "0",
				"X-Data-Timestamp": Date.now().toString(),
			},
		});
	} catch (error) {
		console.error("Episodes API: Error fetching episodes:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
