import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userIsActive } from "@/lib/usage";

// GET /api/public/shared-bundles/[bundleId]
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ bundleId: string }> }
) {
	try {
		// Require authentication
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { bundleId } = await params;

		// Only active users may access shared bundles (temporary policy)
		const isActive = await userIsActive(prisma, userId);
		if (!isActive) {
			return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
		}

		// Fetch bundle with active episodes only
		const bundle = await prisma.sharedBundle.findUnique({
			where: {
				shared_bundle_id: bundleId,
				is_active: true, // Only active bundles
			},
			include: {
				owner: {
					select: {
						user_id: true,
						name: true,
						// Don't expose sensitive user information
					},
				},
				episodes: {
					where: {
						is_active: true, // Only active episodes
					},
					include: {
						userEpisode: {
							select: {
								episode_id: true,
								episode_title: true,
								duration_seconds: true,
								gcs_audio_url: true, // For generating signed URLs
								created_at: true,
							},
						},
					},
					orderBy: { display_order: "asc" },
				},
			},
		});

		if (!bundle) {
			return NextResponse.json(
				{ error: "Bundle not found or not active" },
				{ status: 404 }
			);
		}

		// Return bundle with metadata
		type SharedBundleWithEpisodes = Prisma.SharedBundleGetPayload<{
			include: {
				episodes: {
					include: {
						userEpisode: true;
					};
				};
				owner: {
					select: {
						name: true;
					};
				};
			};
		}>;

		return NextResponse.json({
			shared_bundle_id: bundle.shared_bundle_id,
			name: bundle.name,
			description: bundle.description,
			created_at: bundle.created_at,
			owner: {
				name: bundle.owner.name,
			},
			episodes: (bundle as SharedBundleWithEpisodes).episodes.map(
				(ep: SharedBundleWithEpisodes["episodes"][number]) => ({
					episode_id: ep.episode_id,
					display_order: ep.display_order,
					episode_title: ep.userEpisode.episode_title,
					duration_seconds: ep.userEpisode.duration_seconds,
					gcs_audio_url: ep.userEpisode.gcs_audio_url,
					created_at: ep.userEpisode.created_at,
				})
			),
			total_episodes: bundle.episodes.length,
		});
	} catch (error) {
		console.error("[PUBLIC_SHARED_BUNDLE_GET]", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
