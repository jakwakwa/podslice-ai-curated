import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Create a test notification
		const notification = await prisma.notification.create({
			data: {
				notification_id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				user_id: userId,
				type: "episode_ready",
				message: "🎉 Test notification! Your weekly podcast episode 'The Future of AI: Testing Edition' is ready to listen!",
				is_read: false,
			},
		});

		return NextResponse.json({
			success: true,
			notification,
			message: "Test notification created successfully!",
		});
	} catch (error) {
		console.error("[NOTIFICATIONS_TEST_POST]", error);
		return NextResponse.json({ error: "Failed to create test notification" }, { status: 500 });
	}
}
