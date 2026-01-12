import { createVertex } from "@ai-sdk/google-vertex";
import { generateObject } from "ai";
import { z } from "zod";
import { ensureGoogleCredentialsForADC } from "@/lib/google-credentials";

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

	// Configuration
	const modelId = process.env.GEMINI_GENAI_MODEL || "gemini-2.0-flash-lite";
	const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
	const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

	if (!projectId) {
		console.error("GOOGLE_CLOUD_PROJECT_ID not set; skipping asset detection.");
		return [];
	}

	// Ensure auth
	ensureGoogleCredentialsForADC();

	// Initialize Vertex
	const vertex = createVertex({
		project: projectId,
		location: location,
	});

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
			model: vertex(modelId),
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
