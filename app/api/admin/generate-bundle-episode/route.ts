import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";

// Force this API route to be dynamic since it uses requireOrgAdmin() which calls auth()
// export const dynamic = "force-dynamic"
export const maxDuration = 60; // 1 minute should be enough for Inngest job dispatch

// Legacy shape helpers (only type used for narrowing)
interface LegacyEpisodeSource {
	id?: string;
	name?: string;
	url: string;
}

export async function POST(request: Request) {
	try {
		// First check admin status
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck; // Return error response if not admin
		}

		// If we get here, user is admin
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const raw = await request.json();
		// Try new shape first
		const bundleId: string | undefined = raw.bundleId;
		const podcastId: string | undefined = raw.podcastId;
		let youtubeUrl: string | undefined = raw.youtubeUrl;
		let legacyUsed = false;

		if (!youtubeUrl) {
			// Attempt legacy extraction: take first source URL
			if (Array.isArray(raw.sources) && raw.sources.length > 0) {
				const first = raw.sources[0] as LegacyEpisodeSource;
				youtubeUrl = first?.url;
				legacyUsed = true;
			}
		}

		if (!(bundleId && podcastId && youtubeUrl)) {
			return NextResponse.json({ error: "Missing required fields: bundleId, podcastId, youtubeUrl (or legacy sources)" }, { status: 400 });
		}

		// Validate that the bundle exists (and fetch podcasts)
		const bundle = await prisma.bundle.findUnique({
			where: { bundle_id: bundleId },
			include: { bundle_podcast: true },
		});

		if (!bundle) {
			return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
		}

		// Validate that the selected podcast is part of the bundle
		type BundleWithPodcasts = Prisma.BundleGetPayload<{
			include: { bundle_podcast: true };
		}>;
		const isMember = (bundle as BundleWithPodcasts).bundle_podcast.some((bp: BundleWithPodcasts["bundle_podcast"][number]) => bp.podcast_id === podcastId);
		if (!isMember) {
			return NextResponse.json({ error: "Selected podcast is not in the chosen bundle" }, { status: 400 });
		}

		// Single ingestion event (one video -> one curated episode)
		await inngest.send({
			name: "admin.episode.generate.requested",
			data: {
				podcastId,
				adminUserId: userId,
				youtubeUrl,
			},
		});

		const res = NextResponse.json({ success: true, message: "Admin episode generation dispatched", legacy: legacyUsed ? true : undefined });
		if (legacyUsed) {
			res.headers.set("Deprecation", "true");
			res.headers.set("Sunset", new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toUTCString()); // 14 days window
			res.headers.set("Link", '<https://github.com/jakwakwa/podslice-ai-curated>; rel="documentation"; title="Update payload to { youtubeUrl }"');
		}
		return res;
	} catch (error) {
		console.error("Admin generate bundle episode error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
