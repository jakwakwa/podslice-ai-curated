import { auth } from "@clerk/nextjs/server";
import { PlanGate, type Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import type { Bundle, Podcast } from "@/lib/types";
import { CuratedBundlesClient } from "./_components/curated-bundles-client";
import { CuratedBundlesFilters } from "./_components/filters.client";
import { curatedBundlesPageContent } from "./content";

type BundleWithPodcasts = Bundle & {
    podcasts: Podcast[];
    bundleType?: "curated" | "shared";
    shared_bundle_id?: string;
    episodes?: Array<{
        episode_id: string;
        episode_title: string;
        duration_seconds: number | null;
    }>;
    episode_count?: number;
    owner?: {
        user_id: string;
        full_name: string;
    };
};

export const dynamic = "force-dynamic";

export default async function CuratedBundlesPage({
    searchParams,
}: {
    searchParams?: Promise<{ q?: string; min_plan?: string }>;
}) {
    noStore();

    let allBundles: BundleWithPodcasts[] = [];
    let error: string | null = null;

    try {
        const { userId } = await auth();
        if (!userId) {
            throw new Error("Unauthorized");
        }

        const resolvedSearchParams = searchParams ? await searchParams : {};
        const q = resolvedSearchParams?.q?.toString().trim();
        const minPlanParam = resolvedSearchParams?.min_plan?.toString().trim();
        const minPlanFilter =
            minPlanParam && (Object.values(PlanGate) as string[]).includes(minPlanParam)
                ? (minPlanParam as keyof typeof PlanGate)
                : undefined;

        // Fetch curated bundles
        const curatedWhere: Prisma.BundleWhereInput = {
            is_active: true,
            ...(q
                ? {
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        {
                            bundle_podcast: {
                                some: {
                                    podcast: { name: { contains: q, mode: "insensitive" } },
                                },
                            },
                        },
                    ],
                }
                : {}),
            ...(minPlanFilter ? { min_plan: PlanGate[minPlanFilter] } : {}),
        };

        const curatedBundles = await prisma.bundle.findMany({
            where: curatedWhere,
            include: {
                bundle_podcast: { include: { podcast: true } },
            },
            orderBy: { created_at: "desc" },
            cacheStrategy: {
                swr: 60,
                ttl: 360000,
                tags: ["BundlePanel_in_Admin"],
            },
        });

        // Fetch shared bundles
        const sharedWhere: Prisma.SharedBundleWhereInput = {
            is_active: true,
            // Don't show bundles owned by the current user in the discovery view
            owner_user_id: { not: userId },
            ...(q
                ? {
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        {
                            episodes: {
                                some: {
                                    userEpisode: {
                                        episode_title: { contains: q, mode: "insensitive" },
                                    },
                                },
                            },
                        },
                    ],
                }
                : {}),
        };

        const sharedBundles = await prisma.sharedBundle.findMany({
            where: sharedWhere,
            include: {
                episodes: {
                    where: { is_active: true },
                    include: {
                        userEpisode: {
                            select: {
                                episode_id: true,
                                episode_title: true,
                                duration_seconds: true,
                            },
                        },
                    },
                    orderBy: { display_order: "asc" },
                },
                owner: {
                    select: {
                        user_id: true,
                        name: true,
                    },
                },
            },
            orderBy: { created_at: "desc" },
        });

        // Transform curated bundles
        const transformedCuratedBundles: BundleWithPodcasts[] = curatedBundles.map(b => ({
            ...(b as unknown as Bundle),
            podcasts: b.bundle_podcast.map(bp => bp.podcast as unknown as Podcast),
            bundleType: "curated" as const,
        }));

        // Transform shared bundles to match Bundle interface
        const transformedSharedBundles: BundleWithPodcasts[] = sharedBundles.map(sb => ({
            // Map shared bundle fields to Bundle interface
            bundle_id: sb.shared_bundle_id, // Use shared_bundle_id as bundle_id for display
            name: sb.name,
            description: sb.description,
            image_data: null, // Shared bundles don't have images
            image_type: null,
            min_plan: PlanGate.FREE_SLICE, // Shared bundles require at least FREE_SLICE
            is_static: false, // Shared bundles are dynamic, user-created content
            is_active: sb.is_active,
            owner_user_id: sb.owner_user_id,
            created_at: sb.created_at,
            updated_at: sb.updated_at,
            podcasts: [], // Shared bundles don't have podcasts, they have episodes
            bundleType: "shared" as const,
            shared_bundle_id: sb.shared_bundle_id,
            episodes: sb.episodes.map(e => ({
                episode_id: e.userEpisode.episode_id,
                episode_title: e.userEpisode.episode_title,
                duration_seconds: e.userEpisode.duration_seconds,
            })),
            episode_count: sb.episodes.length,
            owner: {
                user_id: sb.owner.user_id,
                full_name: sb.owner.name || "Anonymous User",
            },
        }));

        // Combine both types of bundles
        allBundles = [...transformedCuratedBundles, ...transformedSharedBundles];
    } catch (e) {
        error = e instanceof Error ? e.message : "Failed to load PODSLICE Bundles.";
    }

    return (
        <div className="h-full min-h-[84vh]  rounded-none 	px-0  mx-0 md:mx-3 flex flex-col lg:rounded-3xl md:rounded-4xl  md:mt-0 md:p-8 md:w-full  md:bg-episode-card-wrapper ">
            <PageHeader
                title={curatedBundlesPageContent.header.title}
                description={curatedBundlesPageContent.header.description}
            />
            <div className="bg-[var(--beduk-1)] md:rounded-3xl p-4 mt-6">
                <CuratedBundlesFilters />

                <CuratedBundlesClient bundles={allBundles} error={error} />
            </div>
        </div>
    );
}
