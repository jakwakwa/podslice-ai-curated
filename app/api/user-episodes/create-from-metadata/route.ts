import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { VOICE_NAMES } from "@/lib/constants/voices";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const createFromMetadataSchema = z.object({
	title: z.string().min(2),
	podcastName: z.string().optional(),
	publishedAt: z.string().optional(),
	youtubeUrl: z.string().url().optional(),
	lang: z.string().min(2).max(10).optional(),
	generationMode: z.enum(["single", "multi"]).default("single").optional(),
	voiceA: z.enum(VOICE_NAMES as unknown as [string, ...string[]]).optional(),
	voiceB: z.enum(VOICE_NAMES as unknown as [string, ...string[]]).optional(),
});

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return new NextResponse("Unauthorized", { status: 401 });

		const json = await request.json();
		const parsed = createFromMetadataSchema.safeParse(json);
		if (!parsed.success) return new NextResponse(parsed.error.message, { status: 400 });

		const { title, podcastName, publishedAt, youtubeUrl, lang, generationMode = "single", voiceA, voiceB } = parsed.data;

		// Enforce monthly limit on COMPLETED episodes
		const existingEpisodeCount = await prisma.userEpisode.count({
			where: { user_id: userId, status: "COMPLETED" },
		});
		const EPISODE_LIMIT = 10;
		if (existingEpisodeCount >= EPISODE_LIMIT) return new NextResponse("You have reached your monthly episode creation limit.", { status: 403 });

		const newEpisode = await prisma.userEpisode.create({
			data: {
				user_id: userId,
				youtube_url: "metadata",
				episode_title: title,
				status: "PENDING",
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
			},
		});

		return NextResponse.json(newEpisode, { status: 201 });
	} catch (error) {
		console.error("[USER_EPISODES_CREATE_FROM_METADATA_POST]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
