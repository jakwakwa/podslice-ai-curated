import type { MentionedAsset } from "@/lib/types/intelligence";

/**
 * Helper to extract assets from mentioned_assets or intelligence.tickers
 */
export function getEpisodeAssets(episode: {
	mentioned_assets?: unknown;
	intelligence?: unknown;
}): MentionedAsset[] {
	// 1. Try mentioned_assets
	if (Array.isArray(episode.mentioned_assets) && episode.mentioned_assets.length > 0) {
		return episode.mentioned_assets as unknown as MentionedAsset[];
	}

	// 2. Fallback to intelligence.tickers
	if (episode.intelligence) {
		try {
			const intel =
				typeof episode.intelligence === "string"
					? JSON.parse(episode.intelligence)
					: episode.intelligence;

			if (intel && typeof intel === "object" && "tickers" in intel) {
				const tickers = (intel as { tickers?: unknown }).tickers;
				if (Array.isArray(tickers)) {
					return tickers.map((t: unknown) => ({
						ticker: String(t),
						name: String(t),
						relevanceScore: 0.8, // Default high relevance for intelligence tickers
					}));
				}
			}
		} catch (_) {
			// Ignore parse errors
		}
	}

	return [];
}
