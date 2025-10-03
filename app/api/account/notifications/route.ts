import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Get user notification preferences from database
		const user = await prisma.user.findUnique({
			where: { user_id: userId },
			select: {
				email_notifications: true,
				in_app_notifications: true,
				updated_at: true,
			},
		});

		if (!user) {
			return new NextResponse("User not found", { status: 404 });
		}

		return NextResponse.json({
			emailNotifications: user.email_notifications,
			inAppNotifications: user.in_app_notifications,
			updatedAt: user.updated_at,
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[NOTIFICATIONS_GET]", message);
		return new NextResponse("Internal Error", { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const body = await request.json();
		const { emailNotifications, inAppNotifications } = body;

		// Validate input
		if (typeof emailNotifications !== "boolean") {
			return new NextResponse("emailNotifications must be a boolean", { status: 400 });
		}

		if (typeof inAppNotifications !== "boolean") {
			return new NextResponse("inAppNotifications must be a boolean", { status: 400 });
		}

		// Update user notification preferences
		const updatedUser = await prisma.user.update({
			where: { user_id: userId },
			data: {
				email_notifications: emailNotifications,
				in_app_notifications: inAppNotifications,
				updated_at: new Date(),
			},
			select: {
				email_notifications: true,
				in_app_notifications: true,
				updated_at: true,
			},
		});

		return NextResponse.json({
			emailNotifications: updatedUser.email_notifications,
			inAppNotifications: updatedUser.in_app_notifications,
			updatedAt: updatedUser.updated_at,
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[NOTIFICATIONS_UPDATE]", message);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
