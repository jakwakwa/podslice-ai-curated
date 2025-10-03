import { PlanGate, type Prisma } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import type { Bundle, Podcast } from "@/lib/types";
import { CuratedBundlesClient } from "./_components/curated-bundles-client";
import { CuratedBundlesFilters } from "./_components/filters.client";

type BundleWithPodcasts = Bundle & { podcasts: Podcast[] };

export const dynamic = "force-dynamic";

export default async function CuratedBundlesPage({ searchParams }: { searchParams?: Promise<{ q?: string; min_plan?: string }> }) {
	noStore();

	let curatedBundles: BundleWithPodcasts[] = [];
	let error: string | null = null;

	try {
		const resolvedSearchParams = searchParams ? await searchParams : {};
		const q = resolvedSearchParams?.q?.toString().trim();
		const minPlanParam = resolvedSearchParams?.min_plan?.toString().trim();
		const minPlanFilter = minPlanParam && (Object.values(PlanGate) as string[]).includes(minPlanParam) ? (minPlanParam as keyof typeof PlanGate) : undefined;

		const where: Prisma.BundleWhereInput = {
			is_active: true,
			...(q
				? {
						OR: [{ name: { contains: q, mode: "insensitive" } }, { bundle_podcast: { some: { podcast: { name: { contains: q, mode: "insensitive" } } } } }],
					}
				: {}),
			...(minPlanFilter ? { min_plan: PlanGate[minPlanFilter] } : {}),
		};

		const bundles = await prisma.bundle.findMany({
			where,
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

		curatedBundles = bundles.map(b => ({
			...(b as unknown as Bundle),
			podcasts: b.bundle_podcast.map(bp => bp.podcast as unknown as Podcast),
		}));
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to load PODSLICE Bundles.";
	}

	return (
		<div className="w-full episode-card-wrapper">
			<PageHeader
				title="Explore our Bundles"
				description="Choose from our pre-curated podcast bundles. Each bundle is a fixed selection of 2-5 carefully selected shows and cannot be modified once selected."
			/>

			<CuratedBundlesFilters />

			<CuratedBundlesClient bundles={curatedBundles} error={error} />
		</div>
	);
}
