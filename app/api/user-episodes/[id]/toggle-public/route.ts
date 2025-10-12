import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { copyToSharedBucket, deleteFromSharedBucket } from "@/lib/gcs/utils/gcs";
import { prisma } from "@/lib/prisma";
import { userIsActive } from "@/lib/usage";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { id } = await params;

		// Verify ownership
		const episode = await prisma.userEpisode.findUnique({
			where: { episode_id: id },
			select: {
				user_id: true,
				gcs_audio_url: true,
				is_public: true,
				public_gcs_audio_url: true,
				status: true,
			},
		});

		if (!episode) {
			return new NextResponse("Episode not found", { status: 404 });
		}

		if (episode.user_id !== userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Verify user is active
		const isActive = await userIsActive(prisma, userId);
		if (!isActive) {
			return new NextResponse("Subscription required", { status: 403 });
		}

		// Only completed episodes can be shared
		if (episode.status !== "COMPLETED") {
			return new NextResponse("Episode must be completed before sharing", { status: 400 });
		}

		if (!episode.gcs_audio_url) {
			return new NextResponse("Episode audio not available", { status: 400 });
		}

		// Toggle logic
		if (episode.is_public) {
			// Make private: delete from shared bucket
			if (episode.public_gcs_audio_url) {
				try {
					await deleteFromSharedBucket(episode.public_gcs_audio_url);
				} catch (error) {
					console.error("[TOGGLE_PUBLIC] Failed to delete from shared bucket:", error);
					// Continue anyway - update DB even if delete fails
				}
			}

			await prisma.userEpisode.update({
				where: { episode_id: id },
				data: {
					is_public: false,
					public_gcs_audio_url: null,
				},
			});

			return NextResponse.json({ is_public: false, public_gcs_audio_url: null });
		}

		// Make public: copy to shared bucket
		const publicGcsUrl = await copyToSharedBucket(episode.gcs_audio_url);

		await prisma.userEpisode.update({
			where: { episode_id: id },
			data: {
				is_public: true,
				public_gcs_audio_url: publicGcsUrl,
			},
		});

		return NextResponse.json({ is_public: true, public_gcs_audio_url: publicGcsUrl });
	} catch (error) {
		console.error("[TOGGLE_PUBLIC]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
