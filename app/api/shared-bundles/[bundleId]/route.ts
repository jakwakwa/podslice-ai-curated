import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateSharedBundleSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	is_active: z.boolean().optional(),
	episodeUpdates: z
		.array(
			z.object({
				episode_id: z.string(),
				is_active: z.boolean(),
			})
		)
		.optional(),
});

// PATCH /api/shared-bundles/[bundleId]
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ bundleId: string }> }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { bundleId } = await params;

		// Verify bundle ownership
		const bundle = await prisma.sharedBundle.findUnique({
			where: { shared_bundle_id: bundleId },
		});

		if (!bundle) {
			return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
		}

		if (bundle.owner_user_id !== userId) {
			return NextResponse.json(
				{ error: "You do not own this bundle" },
				{ status: 403 }
			);
		}

		// Parse request body
		const body = await request.json();
		const validation = UpdateSharedBundleSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.error.errors[0].message },
				{ status: 400 }
			);
		}

		const { name, description, is_active, episodeUpdates } = validation.data;

		// Update bundle and episode statuses in a transaction
		await prisma.$transaction(async (tx) => {
			// Update bundle fields if provided
			if (name !== undefined || description !== undefined || is_active !== undefined) {
				await tx.sharedBundle.update({
					where: { shared_bundle_id: bundleId },
					data: {
						...(name !== undefined && { name }),
						...(description !== undefined && { description }),
						...(is_active !== undefined && { is_active }),
					},
				});
			}

			// Update episode statuses if provided
			if (episodeUpdates && episodeUpdates.length > 0) {
				for (const update of episodeUpdates) {
					await tx.sharedBundleEpisode.update({
						where: {
							shared_bundle_id_episode_id: {
								shared_bundle_id: bundleId,
								episode_id: update.episode_id,
							},
						},
						data: {
							is_active: update.is_active,
						},
					});
				}
			}
		});

		// Fetch updated bundle
		const updatedBundle = await prisma.sharedBundle.findUnique({
			where: { shared_bundle_id: bundleId },
			include: {
				episodes: {
					include: {
						userEpisode: {
							select: {
								episode_id: true,
								episode_title: true,
								duration_seconds: true,
								created_at: true,
							},
						},
					},
					orderBy: { display_order: "asc" },
				},
			},
		});

		return NextResponse.json(updatedBundle);
	} catch (error) {
		console.error("[SHARED_BUNDLE_PATCH]", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// DELETE /api/shared-bundles/[bundleId]
export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ bundleId: string }> }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { bundleId } = await params;

		// Verify bundle ownership
		const bundle = await prisma.sharedBundle.findUnique({
			where: { shared_bundle_id: bundleId },
			include: {
				episodes: true,
			},
		});

		if (!bundle) {
			return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
		}

		if (bundle.owner_user_id !== userId) {
			return NextResponse.json(
				{ error: "You do not own this bundle" },
				{ status: 403 }
			);
		}

		// Check if any episodes are active
		const hasActiveEpisodes = bundle.episodes.some((ep) => ep.is_active);

		if (hasActiveEpisodes) {
			return NextResponse.json(
				{ error: "Cannot delete bundle with active episodes. Disable all episodes first." },
				{ status: 400 }
			);
		}

		// Delete bundle (cascade will handle junction table)
		await prisma.sharedBundle.delete({
			where: { shared_bundle_id: bundleId },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[SHARED_BUNDLE_DELETE]", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
