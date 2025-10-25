import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const revalidate = 0

import type { Prisma } from "@prisma/client"
import { PlanGate as PlanGateEnum } from "@prisma/client"
import { prisma } from "../../../lib/prisma"

type BundleWithPodcasts = Prisma.BundleGetPayload<{ include: { bundle_podcast: { include: { podcast: true } } } }>

function resolveAllowedGates(plan: string | null | undefined): PlanGateEnum[] {
	const normalized = (plan || "").toString().trim().toLowerCase()

	if (normalized === "curate_control" || normalized === "curate control") {
		return [PlanGateEnum.NONE, PlanGateEnum.FREE_SLICE, PlanGateEnum.CASUAL_LISTENER, PlanGateEnum.CURATE_CONTROL]
	}
	if (normalized === "casual_listener" || normalized === "casual listener" || normalized === "casual") {
		return [PlanGateEnum.NONE, PlanGateEnum.FREE_SLICE, PlanGateEnum.CASUAL_LISTENER]
	}
	if (normalized === "free_slice" || normalized === "free slice" || normalized === "free" || normalized === "freeslice") {
		return [PlanGateEnum.NONE, PlanGateEnum.FREE_SLICE]
	}
	// Default: NONE plan or no plan
	return [PlanGateEnum.NONE]
}

export async function GET(_request: NextRequest) {
	try {
		// Check if we're in a build environment
		if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
			console.log("[CURATED_BUNDLES_GET] Skipping during build - no DATABASE_URL")
			return NextResponse.json([])
		}

		const { userId } = await auth()
		let plan: string | null = null
		if (userId) {
			const sub = await prisma.subscription.findFirst({ where: { user_id: userId }, orderBy: { updated_at: "desc" } })
			plan = sub?.plan_type ?? null
			// Admin bypass: treat admin as highest plan
			const user = await prisma.user.findUnique({ where: { user_id: userId }, select: { is_admin: true } })
			if (user?.is_admin) {
				plan = "curate_control"
			}
		}
		const allowedGates = resolveAllowedGates(plan)

		// Get all active admin-curated bundles (return locked ones too)
        const adminBundles: BundleWithPodcasts[] = await prisma.bundle.findMany({
			where: { is_active: true },
			include: {
				bundle_podcast: {
					include: {
						podcast: true,
					},
				},
			},
			orderBy: { created_at: "desc" },
            cacheStrategy: {
                // Weekly cache; allow background revalidation
                swr: 3600, // 1 hour SWR window for background refreshes
                ttl: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
                tags: ["curated_bundles"],
            },
		})

		// Get all active shared bundles
        const sharedBundles = await prisma.sharedBundle.findMany({
			where: { is_active: true },
			include: {
				owner: {
					select: {
						user_id: true,
						name: true,
					},
				},
				episodes: {
					where: { is_active: true },
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
            cacheStrategy: {
                swr: 3600, // refresh in background hourly
                ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
                tags: ["shared_bundles"],
            },
		})

		const bundles = adminBundles

		// Transform admin bundles with gating info
		const transformedAdminBundles = bundles.map(bundle => {
			const gate = bundle.min_plan
			// Ensure we're comparing the same types - convert both to strings for comparison
			const canInteract = allowedGates.some(allowedGate => allowedGate === gate)
			const lockReason = canInteract ? null : "This bundle requires a higher plan."

			return {
				...bundle,
				podcasts: bundle.bundle_podcast.map(bp => bp.podcast),
				canInteract,
				lockReason,
				bundleType: "curated" as const,
			}
		})

		// Transform shared bundles - available to FREE_SLICE, CASUAL_LISTENER, and CURATE_CONTROL
		const transformedSharedBundles = sharedBundles.map(bundle => {
			// Shared bundles available to all plans except NONE
			const canInteract = allowedGates.some(gate => gate !== PlanGateEnum.NONE)
			const lockReason = canInteract ? null : "Shared bundles require a paid plan."

			return {
				bundle_id: bundle.shared_bundle_id,
				shared_bundle_id: bundle.shared_bundle_id,
				name: bundle.name,
				description: bundle.description,
				image_url: null, // Shared bundles don't have images yet
				is_active: bundle.is_active,
				created_at: bundle.created_at,
				min_plan: PlanGateEnum.FREE_SLICE, // Shared bundles require at least FREE_SLICE
				episodes: bundle.episodes.map(ep => ({
					episode_id: ep.userEpisode.episode_id,
					episode_title: ep.userEpisode.episode_title,
					duration_seconds: ep.userEpisode.duration_seconds,
				})),
				episode_count: bundle.episodes.length,
				owner: bundle.owner,
				podcasts: [], // Shared bundles don't have podcasts, they have episodes
				canInteract,
				lockReason,
				bundleType: "shared" as const,
			}
		})

		// Combine both types of bundles
		const allBundles = [...transformedAdminBundles, ...transformedSharedBundles]

		return NextResponse.json(allBundles, { headers: { "Cache-Control": "no-store" } })
	} catch (error) {
		if (process.env.NODE_ENV === "production" || (error instanceof Error && error.message.includes("does not exist"))) {
			return NextResponse.json([])
		}
		// Return more specific error message
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 })
	}
}
