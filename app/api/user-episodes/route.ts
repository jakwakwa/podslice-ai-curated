import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureBucketName, getStorageReader } from "@/lib/inngest/utils/gcs";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const url = new URL(request.url);
		const countOnly = url.searchParams.get("count") === "true";

		if (countOnly) {
			// Return only the count of completed episodes scoped to the current subscription period (fallback: last 30 days)
			const sub = await prisma.subscription.findFirst({
				where: {
					user_id: userId,
					OR: [{ status: "active" }, { status: "trialing" }, { status: "paused" }],
				},
				orderBy: { created_at: "desc" },
				select: { current_period_start: true, current_period_end: true },
			});

			const now = new Date();
			const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			const periodStart = sub?.current_period_start ?? defaultStart;
			const periodEnd = sub?.current_period_end ?? now;

			const completedCount = await prisma.userEpisode.count({
				where: {
					user_id: userId,
					status: "COMPLETED",
					created_at: { gte: periodStart, lte: periodEnd },
				},
			});
			return NextResponse.json({ count: completedCount });
		}

		// Return all episodes (for general listing)
		const episodes = await prisma.userEpisode.findMany({
			where: { user_id: userId },
			orderBy: { created_at: "desc" },
			cacheStrategy: {
				swr: 60,
				ttl: 6000,
			},
		});

		const storageReader = getStorageReader();
		const bucketName = ensureBucketName();

		const episodesWithSignedUrls = await Promise.all(
			episodes.map(async episode => {
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
				return { ...episode, signedAudioUrl };
			})
		);

		return NextResponse.json(episodesWithSignedUrls);
	} catch (error) {
		console.error("[USER_EPISODES_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const body = await request.json();
		const { episode_title, transcript, summary, gcs_audio_url, youtube_url } = body;

		const userEpisode = await prisma.userEpisode.create({
			data: {
				episode_title,
				youtube_url,
				transcript,
				summary,
				gcs_audio_url,
				user_id: userId,
			},
		});

		return NextResponse.json(userEpisode);
	} catch (error) {
		console.error("[USER_EPISODES_POST]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}

export async function DELETE() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		await prisma.userEpisode.deleteMany({
			where: { user_id: userId },
		});

		return new NextResponse("All user episodes deleted", { status: 200 });
	} catch (error) {
		console.error("[USER_EPISODES_DELETE]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
