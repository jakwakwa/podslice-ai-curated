import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PRICING_TIER } from "@/config/paddle-config";
import { VOICE_NAMES } from "@/lib/constants/voices";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const createEpisodeSchema = z.object({
	youtubeUrl: z.string().url(),
	episodeTitle: z.string().min(1),
	transcript: z.string().min(1),
	generationMode: z.enum(["single", "multi"]).default("single").optional(),
	voiceA: z.enum(VOICE_NAMES as unknown as [string, ...string[]]).optional(),
	voiceB: z.enum(VOICE_NAMES as unknown as [string, ...string[]]).optional(),
	useShortEpisodesOverride: z.boolean().optional(),
});

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const json = await request.json();
		const parsed = createEpisodeSchema.safeParse(json);

		if (!parsed.success) {
			return new NextResponse(parsed.error.message, { status: 400 });
		}

		const { youtubeUrl, episodeTitle, transcript, generationMode = "single", voiceA, voiceB, useShortEpisodesOverride } = parsed.data;

		// Count only completed user episodes for this user
		const existingEpisodeCount = await prisma.userEpisode.count({
			where: {
				user_id: userId,
				status: "COMPLETED",
			},
		});

		// Get episode limit from plan configuration
		const EPISODE_LIMIT = PRICING_TIER[2].episodeLimit; // CURATE_CONTROL plan limit
		if (existingEpisodeCount >= EPISODE_LIMIT) {
			return new NextResponse("You have reached your monthly episode creation limit.", { status: 403 });
		}

		const newEpisode = await prisma.userEpisode.create({
			data: {
				user_id: userId,
				youtube_url: youtubeUrl,
				episode_title: episodeTitle,
				transcript: transcript,
				status: "PENDING",
			},
		});

		if (generationMode === "multi") {
			if (!(voiceA && voiceB)) {
				return new NextResponse("Two voices are required for multi-speaker generation.", { status: 400 });
			}
			await inngest.send({
				name: "user.episode.generate.multi.requested",
				data: {
					userEpisodeId: newEpisode.episode_id,
					voiceA,
					voiceB,
					useShortEpisodesOverride,
				},
			});
		} else {
			await inngest.send({
				name: "user.episode.generate.requested",
				data: {
					userEpisodeId: newEpisode.episode_id,
				},
			});
		}

		return NextResponse.json(newEpisode, { status: 201 });
	} catch (error) {
		console.error("[USER_EPISODES_CREATE_POST]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
