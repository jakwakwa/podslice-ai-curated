"use server";

import { auth } from "@clerk/nextjs/server";
import { findRelevantAssets } from "@/lib/inngest/utils/asset-matcher";
import { prisma } from "@/lib/prisma";

export interface AssetSuggestion {
	id: string;
	title: string;
	sourceUrl: string;
	assetType: string;
}

export async function detectRelevantAssets(
	podcastTitle: string,
	podcastDescription: string = ""
): Promise<AssetSuggestion[]> {
	const { userId } = await auth();
	if (!userId) return [];

	try {
		const userAssets = await prisma.researchAsset.findMany({
			where: { userId },
			select: {
				id: true,
				title: true,
				description: true,
				tags: true,
				assetType: true,
				sourceUrl: true,
			},
		});

		if (userAssets.length === 0) return [];

		const relevantIds = await findRelevantAssets(
			podcastTitle,
			podcastDescription,
			userAssets
		);

		if (relevantIds.length === 0) return [];

		// Filter userAssets to get the details of relevant ones
		const suggestions = userAssets
			.filter(asset => relevantIds.includes(asset.id))
			.map(asset => ({
				id: asset.id,
				title: asset.title,
				sourceUrl: asset.sourceUrl,
				assetType: asset.assetType,
			}));

		return suggestions;
	} catch (error) {
		console.error("Error detecting assets:", error);
		return [];
	}
}
