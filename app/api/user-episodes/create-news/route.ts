import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PRICING_TIER } from "@/config/paddle-config";
import { VOICE_NAMES } from "@/lib/constants/voices";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import {
	calculateWeightedUsage,
	canCreateEpisode,
	getInsufficientCreditsMessage,
} from "@/lib/types/summary-length";

const ALLOWED_SOURCES = [
	"global",
	"crypto",
	"geo",
	"finance",
	"us"

] as const;
const ALLOWED_TOPICS = [
	"technology",
	"business",
	"bitcoin and crypto",
	"politics",
	"us politics",
	"world news",
	"geo-political",
	"tesla",
	"finance"
] as const;



const CreateNewsSchema = z.object({
	title: z.string().min(2).optional(),
	sources: z.array(z.enum(ALLOWED_SOURCES)).min(1),
	topic: z.string(),
	generationMode: z.enum(["single", "multi"]).default("single").optional(),
	voiceA: z.enum(VOICE_NAMES as unknown as [string, ...string[]]).optional(),
	voiceB: z.enum(VOICE_NAMES as unknown as [string, ...string[]]).optional(),
	summaryLength: z.enum(["SHORT", "MEDIUM", "LONG"]).default("MEDIUM"),
});

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return new NextResponse("Unauthorized", { status: 401 });

		const json = await request.json();
		const parsed = CreateNewsSchema.safeParse(json);
		if (!parsed.success) return new NextResponse(parsed.error.message, { status: 400 });

		const {
			sources,
			topic,
			generationMode = "single",
			voiceA,
			voiceB,
			summaryLength,
		} = parsed.data;
		const episodeTitle =
			json.title?.trim() ||
			`News summary: ${topic} (${sources.map(s => s.toUpperCase()).join(", ")})`;

		// Fetch completed episodes with their lengths
		const completedEpisodes = await prisma.userEpisode.findMany({
			where: { user_id: userId, status: "COMPLETED" },
			select: { summary_length: true },
		});

		// Calculate current weighted usage
		const currentUsage = calculateWeightedUsage(completedEpisodes);

		// Get episode limit from plan configuration
		const EPISODE_LIMIT = PRICING_TIER[2]?.episodeLimit ?? 30;

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

		// Sentinel url marks this as the news-search based flow
		const newEpisode = await prisma.userEpisode.create({
			data: {
				user_id: userId,
				youtube_url: "news",
				episode_title: episodeTitle,
				summary_length: summaryLength,
				status: "PENDING",
				news_sources: sources.join(", "),
				news_topic: topic,
			},
		});

		await inngest.send({
			name: "user.news.generate.requested",
			data: {
				userEpisodeId: newEpisode.episode_id,
				summaryLength,
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
