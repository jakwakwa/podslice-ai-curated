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

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ bundleId: string; episodeId: string }> }
) {
	try {
		// Require authentication
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { bundleId, episodeId } = await params;

		// Verify the episode is part of an active shared bundle
		const bundleEpisode = await prisma.sharedBundleEpisode.findUnique({
			where: {
				shared_bundle_id_episode_id: {
					shared_bundle_id: bundleId,
					episode_id: episodeId,
				},
				is_active: true,
			},
			include: {
				sharedBundle: {
					select: {
						is_active: true,
					},
				},
				userEpisode: {
					select: {
						audio_file_path: true,
					},
				},
			},
		});

		if (!bundleEpisode || !bundleEpisode.sharedBundle.is_active) {
			return new NextResponse("Episode not found in active bundle", { status: 404 });
		}

		const audioFilePath = bundleEpisode.userEpisode.audio_file_path;

		if (!audioFilePath) {
			return new NextResponse("Audio file not available", { status: 404 });
		}

		// If the audio is already an external/public URL not in GCS, return as-is
		const parsedGs = parseGcsUri(audioFilePath);
		const parsedHttp = parsedGs ? null : extractGcsFromHttp(audioFilePath);

		if (!(parsedGs || parsedHttp)) {
			return NextResponse.json({ signedUrl: audioFilePath });
		}

		const { bucket, object } = parsedGs ?? parsedHttp!;
		const reader = getStorageReader();

		// Generate a signed URL valid for 30 days for shared bundles
		const [url] = await reader
			.bucket(bucket)
			.file(object)
			.getSignedUrl({ action: "read", expires: Date.now() + 30 * 24 * 60 * 60 * 1000 });

		return NextResponse.json({ signedUrl: url });
	} catch (error) {
		console.error("[SHARED_BUNDLE_EPISODE_PLAY_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
