import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PRICING_TIER } from "@/config/paddle-config";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import {
	calculateWeightedUsage,
	canCreateEpisode,
	getInsufficientCreditsMessage,
} from "@/lib/types/summary-length";

const createFromMetadataSchema = z.object({
	title: z.string().min(2),
	podcastName: z.string().optional(),
	publishedAt: z.string().optional(),
	youtubeUrl: z.string().url().optional(),
	lang: z.string().min(2).max(10).optional(),
	generationMode: z.enum(["single", "multi"]).default("single").optional(),
	voiceA: z.string().optional(), // Allow legacy or new voice names
	voiceB: z.string().optional(),
	summaryLength: z.enum(["SHORT", "MEDIUM", "LONG"]).default("SHORT"),
	// B2B Research Lab
	referenceDocUrl: z.string().url().optional().or(z.literal("")),
	contextWeight: z.number().min(0).max(1).optional(),
	voiceArchetype: z.string().optional(),
});

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return new NextResponse("Unauthorized", { status: 401 });

		const json = await request.json();
		const parsed = createFromMetadataSchema.safeParse(json);
		if (!parsed.success) return new NextResponse(parsed.error.message, { status: 400 });

		const {
			title,
			podcastName,
			publishedAt,
			youtubeUrl,
			lang,
			generationMode = "single",
			voiceA,
			voiceB,
			summaryLength,
			referenceDocUrl,
			contextWeight,
			voiceArchetype,
		} = parsed.data;

		// Fetch completed episodes with their lengths (excluding auto-generated)
		const completedEpisodes = await prisma.userEpisode.findMany({
			where: {
				user_id: userId,
				status: "COMPLETED",
				auto_generated: false, // Only count manually created episodes
			},
			select: { summary_length: true },
		});

		// Calculate current weighted usage
		const currentUsage = calculateWeightedUsage(completedEpisodes);

		// Get episode limit from plan configuration
		const EPISODE_LIMIT = PRICING_TIER[2]?.episodeLimit ?? 30; // CURATE_CONTROL plan limit

		// Check if user can create episode of requested length
		const check = canCreateEpisode(currentUsage, summaryLength, EPISODE_LIMIT);
		if (!check.canCreate) {
			const message = getInsufficientCreditsMessage(
				currentUsage,
				summaryLength,
				EPISODE_LIMIT
			);
			return new NextResponse(message, { status: 403 });
		}

		const newEpisode = await prisma.userEpisode.create({
			data: {
				user_id: userId,
				youtube_url: "metadata",
				episode_title: title,
				summary_length: summaryLength,
				status: "PENDING",
				// B2B Fields
				reference_doc_url: referenceDocUrl,
				context_weight: contextWeight,
				voice_archetype: voiceArchetype || voiceA, // Fallback or use selected voice
			},
		});

		await inngest.send({
			name: "user.episode.metadata.requested",
			data: {
				userEpisodeId: newEpisode.episode_id,
				title,
				podcastName,
				publishedAt,
				youtubeUrl,
				lang,
				generationMode,
				voiceA,
				voiceB,
				summaryLength,
				// B2B Fields
				referenceDocUrl,
				contextWeight,
				voiceArchetype,
			},
		});

		return NextResponse.json(newEpisode, { status: 201 });
	} catch (error) {
		console.error("[USER_EPISODES_CREATE_FROM_METADATA_POST]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
