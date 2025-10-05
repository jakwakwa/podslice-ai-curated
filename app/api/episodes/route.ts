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

	console.log("[EPISODES_API] Bundle Type:", bundleType);
	console.log("[EPISODES_API] Selected Curated Bundle:", profile?.selectedBundle?.name || "None");
	console.log("[EPISODES_API] Selected Shared Bundle:", profile?.selectedSharedBundle?.name || "None");
	console.log("[EPISODES_API] Curated podcasts count:", podcastIdsInSelectedBundle.length);
	console.log("[EPISODES_API] Shared episode IDs count:", sharedBundleEpisodeIds.length);

		// Fetch curated episodes (from Episode table)
		let curatedEpisodes: any[] = [];
		if (bundleType === "curated" || bundleType === "all") {
			const whereClause: any = {
				OR: [
					{ userProfile: { user_id: userId } },
				],
			};

			if (podcastIdsInSelectedBundle.length > 0) {
				whereClause.OR.push({ podcast_id: { in: podcastIdsInSelectedBundle } });
			}
			if (profile?.selectedBundle?.bundle_id) {
				whereClause.OR.push({ bundle_id: profile.selectedBundle.bundle_id });
			}

			curatedEpisodes = await withDatabaseTimeout(
				prisma.episode.findMany({
					where: whereClause,
					include: {
						podcast: true,
						userProfile: true,
					},
					orderBy: { created_at: "desc" },
				})
			);
		}

		// Fetch shared bundle episodes (from UserEpisode table)
		let sharedEpisodes: any[] = [];
		if ((bundleType === "shared" || bundleType === "all") && sharedBundleEpisodeIds.length > 0) {
			const userEpisodes = await withDatabaseTimeout(
				prisma.userEpisode.findMany({
					where: {
						episode_id: { in: sharedBundleEpisodeIds },
						status: "COMPLETED",
					},
					include: {
						user: {
							select: {
								user_id: true,
								name: true,
							},
						},
					},
					orderBy: { created_at: "desc" },
				})
			);

			// Transform UserEpisodes to match Episode structure for frontend compatibility
			sharedEpisodes = userEpisodes.map(ue => ({
				episode_id: ue.episode_id,
				title: ue.episode_title,
				description: ue.summary || "",
				// Use the user-episodes play endpoint for signed URLs
				audio_url: `/api/user-episodes/${ue.episode_id}/play`,
				image_url: null,
				duration_seconds: ue.duration_seconds,
				published_at: ue.created_at,
				created_at: ue.created_at,
				podcast_id: null,
				bundle_id: null,
				profile_id: null,
				week_nr: null,
				// Mark as user episode for frontend differentiation
				podcast: null,
				userProfile: null,
				// Add user episode specific data
				_isUserEpisode: true,
				_sourceUser: ue.user,
				_youtubeUrl: ue.youtube_url,
				_gcsAudioUrl: ue.gcs_audio_url, // Keep original for reference
			}));
		}

	// Combine both types of episodes
	const episodes = [...curatedEpisodes, ...sharedEpisodes];

	console.log("[EPISODES_API] Curated episodes fetched:", curatedEpisodes.length);
	console.log("[EPISODES_API] Shared episodes fetched:", sharedEpisodes.length);
	console.log("[EPISODES_API] Total episodes:", episodes.length);

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
