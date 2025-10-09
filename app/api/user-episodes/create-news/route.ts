import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PRICING_TIER } from "@/config/paddle-config";
import { VOICE_NAMES } from "@/lib/constants/voices";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const ALLOWED_SOURCES = ["guardian", "reuters", "worldbank", "un", "stocks"] as const;
const ALLOWED_TOPICS = ["technology", "business", "politics", "world", "tesla", "finance"] as const;

const CreateNewsSchema = z.object({
	title: z.string().min(2).optional(),
	sources: z.array(z.enum(ALLOWED_SOURCES)).min(1),
	topic: z.enum(ALLOWED_TOPICS),
	generationMode: z.enum(["single", "multi"]).default("single").optional(),
	voiceA: z.enum(VOICE_NAMES as unknown as [string, ...string[]]).optional(),
	voiceB: z.enum(VOICE_NAMES as unknown as [string, ...string[]]).optional(),
});

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return new NextResponse("Unauthorized", { status: 401 });

		const json = await request.json();
		const parsed = CreateNewsSchema.safeParse(json);
		if (!parsed.success) return new NextResponse(parsed.error.message, { status: 400 });

		const { sources, topic, generationMode = "single", voiceA, voiceB } = parsed.data;
		const episodeTitle = json.title?.trim() || `News summary: ${topic} (${sources.map(s => s.toUpperCase()).join(", ")})`;

		// Enforce monthly limit on COMPLETED episodes (same heuristic as metadata route)
		const existingEpisodeCount = await prisma.userEpisode.count({
			where: { user_id: userId, status: "COMPLETED" },
		});
		const EPISODE_LIMIT = PRICING_TIER[2].episodeLimit;
		if (existingEpisodeCount >= EPISODE_LIMIT) {
			return new NextResponse("You have reached your monthly episode creation limit.", { status: 403 });
		}

		// Sentinel url marks this as the news-search based flow
		const newEpisode = await prisma.userEpisode.create({
			data: {
				user_id: userId,
				youtube_url: "news",
				episode_title: episodeTitle,
				status: "PENDING",
				news_sources: sources.join(", "),
				news_topic: topic,
			},
		});

		await inngest.send({
			name: "user.news.generate.requested",
			data: {
				userEpisodeId: newEpisode.episode_id,
				sources,
				topic,
				generationMode,
				voiceA,
				voiceB,
			},
		});

		return NextResponse.json(newEpisode, { status: 201 });
	} catch (error) {
		console.error("[USER_EPISODES_CREATE_NEWS_POST]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
