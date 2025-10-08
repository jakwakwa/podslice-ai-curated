import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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
			console.log(`[EPISODE_PLAY_GET] Episode not found for id: ${id}`);
			return new NextResponse("Episode not found", { status: 404 });
		}

		console.log(`[EPISODE_PLAY_GET] Episode found - podcast_id: ${episode.podcast_id}, bundle_id: ${episode.bundle_id || "null"}`);

		// Load the user's active profile and selected bundle (for authorization)
		const profile = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId, is_active: true },
			include: { selectedBundle: { include: { bundle_podcast: true } } },
		});

		const podcastIdsInSelectedBundle = profile?.selectedBundle?.bundle_podcast.map(bp => bp.podcast_id) ?? [];
		const selectedBundleId = profile?.selectedBundle?.bundle_id ?? null;

		console.log(
			`[EPISODE_PLAY_GET] Profile auth - selectedBundleId: ${selectedBundleId || "null"}, podcastIdsInSelectedBundle: [${podcastIdsInSelectedBundle.join(", ")}] (count: ${podcastIdsInSelectedBundle.length})`
		);

		const isOwnedByUser = episode.userProfile?.user_id === userId;
		const isInSelectedBundleByPodcast = podcastIdsInSelectedBundle.length > 0 && podcastIdsInSelectedBundle.includes(episode.podcast_id);
		const isDirectlyLinkedToSelectedBundle = !!selectedBundleId && episode.bundle_id === selectedBundleId;
		const authorized = isOwnedByUser || isInSelectedBundleByPodcast || isDirectlyLinkedToSelectedBundle;

		console.log(
			`[EPISODE_PLAY_GET] Auth checks - isOwnedByUser: ${isOwnedByUser}, isInSelectedBundleByPodcast: ${isInSelectedBundleByPodcast}, isDirectlyLinkedToSelectedBundle: ${isDirectlyLinkedToSelectedBundle}, authorized: ${authorized}`
		);

		if (!authorized) {
			console.log(`[EPISODE_PLAY_GET] Access denied for episode ${id}`);
			return new NextResponse("Forbidden", { status: 403 });
		}

		const sourceUrl = episode.audio_url;

		console.log(
			`[EPISODE_PLAY_GET] Source URL format: startsWith gs://? ${sourceUrl.startsWith("gs://")}, is HTTP storage? ${sourceUrl.includes("storage.googleapis.com") || sourceUrl.includes("storage.cloud.google.com")}`
		);

		// If the audio is already an external/public URL not in GCS, return as-is
		const parsedGs = parseGcsUri(sourceUrl);
		const parsedHttp = parsedGs ? null : extractGcsFromHttp(sourceUrl);

		console.log(`[EPISODE_PLAY_GET] Parsing - parsedGs: ${!!parsedGs}, parsedHttp: ${!!parsedHttp}`);

		if (!(parsedGs || parsedHttp)) {
			console.log(`[EPISODE_PLAY_GET] Direct URL, returning: ${sourceUrl.startsWith("http") ? "HTTPS" : "other"}`);
			return NextResponse.json({ signedUrl: sourceUrl });
		}

		const { bucket, object } = parsedGs ?? parsedHttp!;
		console.log(`[EPISODE_PLAY_GET] Signing - bucket: ${bucket}, object prefix: ${object.substring(0, 50)}...`);

		const reader = getStorageReader();
		const [url] = await reader
			.bucket(bucket)
			.file(object)
			.getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });

		console.log(`[EPISODE_PLAY_GET] Signed URL generated successfully`);

		return NextResponse.json({ signedUrl: url });
	} catch (error) {
		console.error("[EPISODE_PLAY_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
