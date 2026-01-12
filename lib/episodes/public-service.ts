import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureSharedBucketName, parseGcsUri } from "@/lib/inngest/utils/gcs";
import type { UserEpisode } from "@/lib/types";

// Zod schema for validating the episode
export const UserEpisodeSchema = z.object({
	episode_id: z.string(),
	user_id: z.string(),
	episode_title: z.string(),
	youtube_url: z.string(),
	transcript: z.string().nullable().optional(),
	summary: z.string().nullable().optional(),
	public_gcs_audio_url: z.string().nullable().optional(),
	duration_seconds: z.number().nullable().optional(),
	status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
	intelligence: z.any().nullable().optional(),
	created_at: z.date(),
	updated_at: z.date(),
	is_public: z.boolean(),
});

export type EpisodeWithPublicUrl = UserEpisode & {
	publicAudioUrl: string | null;
	is_public: boolean;
	intelligence?: any;
};

export async function getPublicEpisode(id: string): Promise<EpisodeWithPublicUrl | null> {
	const episode = await prisma.userEpisode.findUnique({
		where: { episode_id: id, is_public: true },
		select: {
			episode_id: true,
			user_id: true,
			episode_title: true,
			youtube_url: true,
			summary: true,
			public_gcs_audio_url: true,
			duration_seconds: true,
			status: true,
			intelligence: true,
			created_at: true,
			updated_at: true,
			is_public: true,
			transcript: false, // Don't expose full transcript publicly
		},
	});

	if (!episode) return null;
	if (!episode.is_public) return null;

	// Get public URL
	let publicAudioUrl: string | null = null;
	const publicGcsUrl = episode.public_gcs_audio_url;
	if (publicGcsUrl) {
		const parsed = parseGcsUri(publicGcsUrl);
		if (parsed) {
			const sharedBucket = ensureSharedBucketName();
			// Public URL format
			publicAudioUrl = `https://storage.googleapis.com/${sharedBucket}/${parsed.object}`;
		}
	}

	const safe = UserEpisodeSchema.parse(episode) as UserEpisode & {
		is_public: boolean;
	};
	return { ...safe, publicAudioUrl, transcript: null };
}

/**
 * Extract clean description from summary (handles JSON summaries for news episodes)
 */
export function extractCleanDescription(
	summary: string | null | undefined,
	maxLength = 160
): string | undefined {
	if (!summary) return undefined;

	try {
		// Try to parse as JSON first (news episodes)
		let cleanSummary = summary.trim();

		// Remove code block markers if present
		if (cleanSummary.startsWith("```json")) {
			cleanSummary = cleanSummary.replace(/^```json\s*/, "").replace(/\s*```$/, "");
		} else if (cleanSummary.startsWith("```")) {
			cleanSummary = cleanSummary.replace(/^```\s*/, "").replace(/\s*```$/, "");
		} else if (cleanSummary.includes("```json")) {
			const jsonMatch = cleanSummary.match(/```json\s*(\{[\s\S]*?\})\s*```/);
			if (jsonMatch?.[1]) {
				cleanSummary = jsonMatch[1];
			}
		} else if (cleanSummary.includes("```")) {
			const jsonMatch = cleanSummary.match(/```\s*(\{[\s\S]*?\})\s*```/);
			if (jsonMatch?.[1]) {
				cleanSummary = jsonMatch[1];
			}
		}

		cleanSummary = cleanSummary.trim();

		// Try to parse as JSON
		const summaryData = JSON.parse(cleanSummary);

		// Extract meaningful text from JSON (prioritize fields that make good descriptions)
		if (summaryData.top_headlines) {
			return summaryData.top_headlines.substring(0, maxLength);
		}
		if (summaryData.ai_summary) {
			return summaryData.ai_summary.substring(0, maxLength);
		}
		if (summaryData.summary_title) {
			return summaryData.summary_title.substring(0, maxLength);
		}

		// Fallback: just use a generic description
		return "Listen to this AI-curated podcast episode";
	} catch {
		// Not JSON, use as-is (regular YouTube episode summary)
		// Strip newlines to make it cleaner for meta tags
		return summary.replace(/\s+/g, " ").substring(0, maxLength);
	}
}
