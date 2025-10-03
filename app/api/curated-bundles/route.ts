import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Prisma } from "@prisma/client";
import { PlanGate as PlanGateEnum } from "@prisma/client";
import { prisma } from "../../../lib/prisma";

type BundleWithPodcasts = Prisma.BundleGetPayload<{ include: { bundle_podcast: { include: { podcast: true } } } }>;

function resolveAllowedGates(plan: string | null | undefined): PlanGateEnum[] {
	const normalized = (plan || "").toString().trim().toLowerCase();

	if (normalized === "curate_control" || normalized === "curate control") {
		return [PlanGateEnum.NONE, PlanGateEnum.FREE_SLICE, PlanGateEnum.CASUAL_LISTENER, PlanGateEnum.CURATE_CONTROL];
	}
	if (normalized === "casual_listener" || normalized === "casual listener" || normalized === "casual") {
		return [PlanGateEnum.NONE, PlanGateEnum.FREE_SLICE, PlanGateEnum.CASUAL_LISTENER];
	}
	if (normalized === "free_slice" || normalized === "free slice" || normalized === "free" || normalized === "freeslice") {
		return [PlanGateEnum.NONE, PlanGateEnum.FREE_SLICE];
	}
	// Default: NONE plan or no plan
	return [PlanGateEnum.NONE];
}

export async function GET(_request: NextRequest) {
	try {
		// Check if we're in a build environment
		if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
			console.log("[CURATED_BUNDLES_GET] Skipping during build - no DATABASE_URL");
			return NextResponse.json([]);
		}

		const { userId } = await auth();
		let plan: string | null = null;
		if (userId) {
			const sub = await prisma.subscription.findFirst({ where: { user_id: userId }, orderBy: { updated_at: "desc" } });
			plan = sub?.plan_type ?? null;
			// Admin bypass: treat admin as highest plan
			const user = await prisma.user.findUnique({ where: { user_id: userId }, select: { is_admin: true } });
			if (user?.is_admin) {
				plan = "curate_control";
			}
		}
		const allowedGates = resolveAllowedGates(plan);

		// Get all active bundles (return locked ones too)
		const bundles: BundleWithPodcasts[] = await prisma.bundle.findMany({
			where: { is_active: true },
			include: {
				bundle_podcast: {
					include: {
						podcast: true,
					},
				},
			},
			orderBy: { created_at: "desc" },
		});

		// Transform with gating info
		const transformedBundles = bundles.map(bundle => {
			const gate = bundle.min_plan;
			// Ensure we're comparing the same types - convert both to strings for comparison
			const canInteract = allowedGates.some(allowedGate => allowedGate === gate);
			const lockReason = canInteract ? null : "This bundle requires a higher plan.";

			return {
				...bundle,
				podcasts: bundle.bundle_podcast.map(bp => bp.podcast),
				canInteract,
				lockReason,
			};
		});

		return NextResponse.json(transformedBundles, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		if (process.env.NODE_ENV === "production" || (error instanceof Error && error.message.includes("does not exist"))) {
			return NextResponse.json([]);
		}
		// Return more specific error message
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
	}
}
