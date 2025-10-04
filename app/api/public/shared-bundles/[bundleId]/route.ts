import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

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
						full_name: true,
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
								audio_file_path: true, // For generating signed URLs
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
		return NextResponse.json({
			shared_bundle_id: bundle.shared_bundle_id,
			name: bundle.name,
			description: bundle.description,
			created_at: bundle.created_at,
			owner: {
				full_name: bundle.owner.full_name,
			},
			episodes: bundle.episodes.map((ep) => ({
				episode_id: ep.episode_id,
				display_order: ep.display_order,
				episode_title: ep.userEpisode.episode_title,
				duration_seconds: ep.userEpisode.duration_seconds,
				audio_file_path: ep.userEpisode.audio_file_path,
				created_at: ep.userEpisode.created_at,
			})),
			total_episodes: bundle.episodes.length,
		});
	} catch (error) {
		console.error("[PUBLIC_SHARED_BUNDLE_GET]", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
