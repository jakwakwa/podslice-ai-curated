import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";

export async function POST() {
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

		// Update all admin-created podcasts to be global (owner_user_id = null)
		const updatedPodcasts = await prisma.podcast.updateMany({
			where: {
				owner_user_id: userId, // Find podcasts owned by the current admin
			},
			data: {
				owner_user_id: null, // Make them global
			},
		});

		return NextResponse.json({
			success: true,
			message: `Updated ${updatedPodcasts.count} podcasts to be global`,
			count: updatedPodcasts.count,
		});
	} catch (error) {
		console.error("Fix podcasts error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
