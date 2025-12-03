import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getStorageReader, parseGcsUri } from "@/lib/inngest/utils/gcs";
import { prisma } from "@/lib/prisma";

function extractGcsFromHttp(url: string): { bucket: string; object: string } | null {
	try {
		const u = new URL(url);
		if (u.hostname === "storage.googleapis.com" || u.hostname === "storage.cloud.google.com") {
			// Path style: /bucket/object
			const path = u.pathname.replace(/^\//, "");
			const slash = path.indexOf("/");
			if (slash > 0) {
				const bucket = path.slice(0, slash);
				const object = path.slice(slash + 1);
				return { bucket, object };
			}
		}
	} catch {
		// ignore parse errors
	}
	return null;
}

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

		const episode = await prisma.episode.findUnique({
			where: { episode_id: id },
			include: { userProfile: { select: { user_id: true } }, podcast: true },
		});

		if (!episode) {
			return new NextResponse("Episode not found", { status: 404 });
		}

		// Load the user's active profile and selected bundle (for authorization)
		type UserCurationProfileWithBundle = Prisma.UserCurationProfileGetPayload<{
			include: {
				selectedBundle: {
					include: { bundle_podcast: true };
				};
			};
		}>;

		const profile: UserCurationProfileWithBundle | null = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId, is_active: true },
			include: { selectedBundle: { include: { bundle_podcast: true } } },
		});

		const podcastIdsInSelectedBundle = profile?.selectedBundle?.bundle_podcast.map((bp: NonNullable<UserCurationProfileWithBundle["selectedBundle"]>["bundle_podcast"][number]) => bp.podcast_id) ?? [];
		const selectedBundleId = profile?.selectedBundle?.bundle_id ?? null;

		const isOwnedByUser = episode.userProfile?.user_id === userId;
		const isInSelectedBundleByPodcast = podcastIdsInSelectedBundle.length > 0 && podcastIdsInSelectedBundle.includes(episode.podcast_id);
		const isDirectlyLinkedToSelectedBundle = !!selectedBundleId && episode.bundle_id === selectedBundleId;
		const authorized = isOwnedByUser || isInSelectedBundleByPodcast || isDirectlyLinkedToSelectedBundle;

		if (!authorized) {
			return new NextResponse("Forbidden", { status: 403 });
		}

		const sourceUrl = episode.audio_url;

		// If the audio is already an external/public URL not in GCS, return as-is
		const parsedGs = parseGcsUri(sourceUrl);
		const parsedHttp = parsedGs ? null : extractGcsFromHttp(sourceUrl);

		if (!(parsedGs || parsedHttp)) {
			return NextResponse.json({ signedUrl: sourceUrl });
		}

		const { bucket, object } = parsedGs ?? parsedHttp!;
		const reader = getStorageReader();
		const [url] = await reader
			.bucket(bucket)
			.file(object)
			.getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });

		return NextResponse.json({ signedUrl: url });
	} catch (error) {
		console.error("[EPISODE_PLAY_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
