import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { id: episodeId } = await params;

		const episode = await prisma.userEpisode.findFirst({
			where: {
				episode_id: episodeId,
				user_id: userId, // Ensure user can only check their own episodes
			},
			select: {
				episode_id: true,
				episode_title: true,
				status: true,
				gcs_audio_url: true,
				summary: true,
				created_at: true,
				updated_at: true,
			},
		});

		if (!episode) {
			return new NextResponse("Episode not found", { status: 404 });
		}

		// Map status to progress information
		const progressInfo = {
			PENDING: { step: 1, total: 5, message: "Starting episode generation..." },
			PROCESSING: { step: 2, total: 5, message: "Processing transcript..." },
			COMPLETED: { step: 5, total: 5, message: "Episode ready!" },
			FAILED: { step: 0, total: 5, message: "Generation failed" },
		};

		const progress = progressInfo[episode.status] || progressInfo.PENDING;

		return NextResponse.json({
			...episode,
			progress,
		});
	} catch (error) {
		console.error("[USER_EPISODE_STATUS_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
