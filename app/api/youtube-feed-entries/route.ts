import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/youtube-feed-entries
 * Deletes all YouTube feed entries for the authenticated user.
 * Called when user changes their YouTube channel/playlist URL.
 */
export async function DELETE() {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Delete all feed entries for this user
		const result = await prisma.youtubeFeedEntry.deleteMany({
			where: { user_id: userId },
		});

		return NextResponse.json({
			success: true,
			deletedCount: result.count,
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[YOUTUBE_FEED_ENTRIES_DELETE]", message);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
