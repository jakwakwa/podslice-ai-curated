import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { updateMissingEpisodeDurations, updateMissingUserEpisodeDurations } from "@/app/(protected)/admin/audio-duration/duration-extractor";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
	try {
		// Check if user is authenticated and admin
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const user = await prisma.user.findUnique({
			where: { user_id: userId },
			select: { is_admin: true },
		});

		if (!user?.is_admin) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { type } = await request.json();

		if (type === "user-episodes") {
			const result = await updateMissingUserEpisodeDurations();
			return NextResponse.json({
				message: `Updated ${result.updated} user episodes, ${result.failed} failed`,
				...result,
			});
		} else if (type === "episodes") {
			const result = await updateMissingEpisodeDurations();
			return NextResponse.json({
				message: `Updated ${result.updated} regular episodes, ${result.failed} failed`,
				...result,
			});
		} else {
			return NextResponse.json({ error: "Invalid type. Use 'user-episodes' or 'episodes'" }, { status: 400 });
		}
	} catch (error) {
		console.error("Duration extraction error:", error);
		return NextResponse.json({ error: "Failed to extract durations" }, { status: 500 });
	}
}
