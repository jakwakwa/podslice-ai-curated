import { createVertex } from "@ai-sdk/google-vertex";
import { generateObject } from "ai";
import { z } from "zod";

const vertex = createVertex();

interface AssetSummary {
	id: string;
	title: string;
	description: string | null;
	tags: string[];
	assetType: string;
}

export async function findRelevantAssets(
	podcastTitle: string,
	podcastDescription: string,
	userAssets: AssetSummary[]
): Promise<string[]> {
	if (userAssets.length === 0) return [];

	const prompt = `
    You are a Research Librarian.
    Podcast: "${podcastTitle}" - ${podcastDescription}

    Available User Assets:
    ${JSON.stringify(
			userAssets.map(a => ({
				id: a.id,
				title: a.title,
				type: a.assetType,
				tags: a.tags,
				description: a.description ? a.description.slice(0, 200) : "No description",
			})),
			null,
			2
		)}

    Task: Return the IDs of assets that are HIGHLY relevant context for this podcast.
    If the podcast is about Ethereum, do NOT select the Tesla 10-K.
    Only select assets that would provide meaningful grounding or fact-checking for the podcast topic.
  `;

	try {
		const { object } = await generateObject({
			model: vertex("gemini-1.5-flash"),
			prompt: prompt,
			schema: z.object({
				relevantAssetIds: z.array(z.string()),
			}),
		});

		return object.relevantAssetIds;
	} catch (error) {
		console.warn("Failed to find relevant assets via Gemini:", error);
		return [];
	}
}
