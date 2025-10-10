import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStorageReader, parseGcsUri } from "@/lib/inngest/utils/gcs";
import { prisma } from "@/lib/prisma";
import { userIsActive } from "@/lib/usage";

export async function GET(_request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Only active users may list episodes
		const isActive = await userIsActive(prisma, userId);
		if (!isActive) {
			return NextResponse.json([], { status: 200 });
		}

		// Exclude transcript and summary to avoid Prisma 4MB response limit
		const episodes = await prisma.userEpisode.findMany({
			where: { user_id: userId },
			select: {
				episode_id: true,
				user_id: true,
				episode_title: true,
				youtube_url: true,
				gcs_audio_url: true,
				duration_seconds: true,
				status: true,
				news_sources: true,
				news_topic: true,
				created_at: true,
				updated_at: true,
				// Explicitly exclude: transcript, summary (too large)
			},
			orderBy: { created_at: "desc" },
			cacheStrategy: {
				swr: 60,
			},
		});

		const storageReader = getStorageReader();

		const episodesWithSignedUrls = await Promise.all(
			episodes.map(async episode => {
				let signedAudioUrl: string | null = null;
				if (episode.gcs_audio_url) {
					const parsed = parseGcsUri(episode.gcs_audio_url);
					if (parsed) {
						const [url] = await storageReader
							.bucket(parsed.bucket)
							.file(parsed.object)
							.getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });
						signedAudioUrl = url;
					}
				}
				return { ...episode, signedAudioUrl };
			})
		);

		return NextResponse.json(episodesWithSignedUrls);
	} catch (error) {
		console.error("[USER_EPISODES_LIST_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
