import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BundleDetailsClient } from "./_components/bundle-details-client";

export const dynamic = "force-dynamic";

interface PageProps {
	params: Promise<{ bundleId: string }>;
}

async function getBundleDetails(bundleId: string, userId: string) {
	const bundle = await prisma?.sharedBundle.findUnique({
		where: {
			shared_bundle_id: bundleId,
			owner_user_id: userId, // Only owner can view
		},
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

	return bundle;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { bundleId } = await params;
	const { userId } = await auth();
	if (!userId) return { title: "Bundle Details" };

	const bundle = await getBundleDetails(bundleId, userId);
	if (!bundle) return { title: "Bundle not found" };

	return {
		title: `Manage ${bundle.name}`,
		description: bundle.description || "Manage your shared bundle",
	};
}

export default async function BundleDetailPage({ params }: PageProps) {
	const { bundleId } = await params;
	const { userId } = await auth();

	if (!userId) notFound();

	const bundle = await getBundleDetails(bundleId, userId);

	if (!bundle) notFound();

	return <BundleDetailsClient bundle={bundle} />;
}
