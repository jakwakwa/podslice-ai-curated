import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureBucketName, getStorageReader } from "@/lib/inngest/utils/gcs";
import { prisma } from "@/lib/prisma";
import { userIsActive } from "@/lib/usage";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { id } = await params;

		// Note: This fetches ALL fields including transcript & summary.
		// Single episode should be under 4MB, but if it exceeds limits,
		// add explicit select to exclude transcript/summary.
		const episode = await prisma.userEpisode.findUnique({
			where: { episode_id: id },
		});

		if (!episode) {
			return new NextResponse("Episode not found", { status: 404 });
		}

		// Check if the episode belongs to the authenticated user
		if (episode.user_id !== userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Inactive users cannot access episode payloads
		const isActive = await userIsActive(prisma, userId);
		if (!isActive) {
			return new NextResponse("Episode not found", { status: 404 });
		}

		const storageReader = getStorageReader();
		const bucketName = ensureBucketName();

		let signedAudioUrl: string | null = null;
		if (episode.gcs_audio_url) {
			// GCS URL is in gs://<bucket>/<object> format
			const objectName = episode.gcs_audio_url.replace(`gs://${bucketName}/`, "");
			const [url] = await storageReader
				.bucket(bucketName)
				.file(objectName)
				.getSignedUrl({
					action: "read",
					expires: Date.now() + 15 * 60 * 1000, // 15 minutes
				});
			signedAudioUrl = url;
		}

		return NextResponse.json({ ...episode, signedAudioUrl });
	} catch (error) {
		console.error("[USER_EPISODE_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
