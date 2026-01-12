/**
 * B2B Intelligence & Financial Analysis Types
 */

export enum MarketSentiment {
	BULLISH = "BULLISH",
	NEUTRAL = "NEUTRAL",
	BEARISH = "BEARISH",
}

export interface MentionedAsset {
	ticker: string; // e.g., "$BTC", "$MSTR"
	name: string; // e.g., "Bitcoin", "MicroStrategy"
	relevanceScore: number; // 0 to 1 (how central the asset was to the discussion)
}

export interface UserEpisodeIntelligence {
	// High-density metrics based on B2B schema
	sentiment?: MarketSentiment | null;
	sentimentScore?: number | null; // -1.0 (very bearish) to 1.0 (very bullish)
	mentionedAssets?: MentionedAsset[];

	// Research Lab additions
	referenceDocUrl?: string | null; // Phase 2: PDF/Whitepaper context
	contextWeight?: number | null; // 0 to 1: weight of PDF vs Audio content
	voiceArchetype?: string | null; // "STRATEGIST" | "TECHNICAL_LEAD" | "NEWSROOM"
	technicalContradictions?: string[]; // Contradictions found in reference docs
}
