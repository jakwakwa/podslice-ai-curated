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

		const userEpisode = await prisma.userEpisode.findUnique({
			where: { episode_id: id },
			include: { user: { select: { user_id: true } } },
		});

		if (!userEpisode) {
			return new NextResponse("User episode not found", { status: 404 });
		}

		// Check if user owns this episode OR if it's in a shared bundle they selected
		const profile = await prisma.userCurationProfile.findFirst({
			where: { user_id: userId, is_active: true },
			include: { 
				selectedSharedBundle: { 
					include: { 
						episodes: { 
							where: { episode_id: id, is_active: true } 
						} 
					} 
				} 
			},
		});

		const isOwnedByUser = userEpisode.user_id === userId;
		const isInSelectedSharedBundle = (profile?.selectedSharedBundle?.episodes.length ?? 0) > 0;
		const authorized = isOwnedByUser || isInSelectedSharedBundle;

		if (!authorized) {
			return new NextResponse("Forbidden - Episode not accessible", { status: 403 });
		}

		const sourceUrl = userEpisode.gcs_audio_url;

		if (!sourceUrl) {
			return new NextResponse("No audio URL available", { status: 404 });
		}

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
		console.error("[USER_EPISODE_PLAY_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
