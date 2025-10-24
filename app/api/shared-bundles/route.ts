import { auth } from "@clerk/nextjs/server";
import { PlanGate } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasPlanAccess } from "@/utils/paddle/plan-utils";

const CreateSharedBundleSchema = z.object({
	name: z.string().min(1, "Bundle name is required"),
	description: z.string().optional(),
	episode_ids: z.array(z.string()).min(1, "At least 1 episode is required").max(10, "Maximum 10 episodes allowed"),
});

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Parse request body
		const body = await request.json();
		const validation = CreateSharedBundleSchema.safeParse(body);

	if (!validation.success) {
		return NextResponse.json(
			{ error: validation.error.errors[0]?.message ?? "Invalid request body" },
			{ status: 400 }
		);
	}

		const { name, description, episode_ids: episodeIds } = validation.data;

		// Validate CURATE_CONTROL plan
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: userId },
			orderBy: { updated_at: "desc" },
		});

		const plan = subscription?.plan_type ?? null;
		if (!hasPlanAccess(plan, PlanGate.CURATE_CONTROL)) {
			return NextResponse.json(
				{ error: "Shared bundles require CURATE_CONTROL plan" },
				{ status: 403 }
			);
		}

	// Check bundle limit (max 5 including disabled)
	const existingBundlesCount = await prisma.sharedBundle.count({
		where: { owner_user_id: userId },
	});

	if (existingBundlesCount >= 5) {
		return NextResponse.json(
			{ error: "Maximum 5 shared bundles allowed per user" },
			{ status: 400 }
		);
	}

		// Validate all episodes belong to the user and are COMPLETED
		const episodes = await prisma.userEpisode.findMany({
			where: {
				episode_id: { in: episodeIds },
			},
			select: {
				episode_id: true,
				user_id: true,
				status: true,
			},
		});

		if (episodes.length !== episodeIds.length) {
			return NextResponse.json(
				{ error: "One or more episodes not found" },
				{ status: 404 }
			);
		}

		const invalidEpisodes = episodes.filter(
			(ep) => ep.user_id !== userId || ep.status !== "COMPLETED"
		);

		if (invalidEpisodes.length > 0) {
			return NextResponse.json(
				{
					error:
						"All episodes must belong to you and be in COMPLETED status",
				},
				{ status: 400 }
			);
		}

		// Create bundle and junction records in a transaction
		const bundle = await prisma.$transaction(async (tx) => {
			const newBundle = await tx.sharedBundle.create({
				data: {
					owner_user_id: userId,
					name,
					description,
				},
			});

			await tx.sharedBundleEpisode.createMany({
				data: episodeIds.map((episodeId, index) => ({
					shared_bundle_id: newBundle.shared_bundle_id,
					episode_id: episodeId,
					display_order: index,
				})),
			});

			return newBundle;
		});

		// Return bundle with shareable URL
		return NextResponse.json(
			{
				shared_bundle_id: bundle.shared_bundle_id,
				name: bundle.name,
				description: bundle.description,
				is_active: bundle.is_active,
				created_at: bundle.created_at,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("[SHARED_BUNDLES_POST]", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// GET /api/shared-bundles - List user's bundles
export async function GET(_request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const bundles = await prisma.sharedBundle.findMany({
			where: { owner_user_id: userId },
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
			orderBy: { created_at: "desc" },
		});

		// Return array directly for easier consumption
		return NextResponse.json(bundles);
	} catch (error) {
		console.error("[SHARED_BUNDLES_GET]", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
