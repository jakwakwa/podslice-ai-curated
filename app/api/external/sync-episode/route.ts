import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const ExternalSyncSchema = z.object({
	podcast: z.object({
		name: z.string(),
		url: z.string().min(1),
		imageUrl: z.string().optional(),
		description: z.string().optional(),
	}),
	episode: z.object({
		videoUrl: z.string().min(1),
		transcript: z.string().min(1),
		title: z.string().optional(),
		description: z.string().optional(),
		imageUrl: z.string().optional(),
	}),
});

export async function POST(req: NextRequest) {
	const authHeader = req.headers.get("Authorization");
	const secret = process.env.EXTERNAL_API_SECRET;

	if (!secret || authHeader !== `Bearer ${secret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await req.json();
		const result = ExternalSyncSchema.safeParse(body);

		if (!result.success) {
			console.error(
				"[EXTERNAL_SYNC] Validation failed:",
				JSON.stringify(result.error.format(), null, 2)
			);
			console.error("[EXTERNAL_SYNC] Received body:", JSON.stringify(body, null, 2));
			return NextResponse.json(
				{ error: "Invalid request body", details: result.error.format() },
				{ status: 400 }
			);
		}

		const { podcast, episode } = result.data;

		// 1. Find or Create Podcast
		let podcastRecord = await prisma.podcast.findUnique({
			where: { url: podcast.url },
		});

		if (!podcastRecord) {
			podcastRecord = await prisma.podcast.create({
				data: {
					name: podcast.name,
					url: podcast.url,
					description: podcast.description,
					image_url: podcast.imageUrl,
					is_active: true,
				},
			});
		}

		// 2. Trigger Inngest Workflow
		const eventId = await inngest.send({
			name: "admin.episode.generate.requested",
			data: {
				podcastId: podcastRecord.podcast_id,
				youtubeUrl: episode.videoUrl,
				adminUserId: "external-sync-bot", // Placeholder as it's not currently used in the workflow logic
				transcript: episode.transcript,
				title: episode.title,
				imageUrl: episode.imageUrl || podcast.imageUrl, // Fallback to podcast image if episode image missing
			},
		});

		return NextResponse.json({
			success: true,
			podcastId: podcastRecord.podcast_id,
			eventId: eventId.ids[0],
		});
	} catch (error) {
		console.error("External sync error:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
