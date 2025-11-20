import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// DEBUG: Check user linkage
		const user = await prisma.user.findUnique({
			where: { user_id: userId },
			select: { paddle_customer_id: true, email: true }
		});
		console.log(`[NOTIFICATIONS_GET] User: ${userId}, Email: ${user?.email}, PaddleID: ${user?.paddle_customer_id}`);

		const notifications = await prisma.notification.findMany({
			where: { user_id: userId },
			orderBy: { created_at: "desc" }
		});

		return NextResponse.json(notifications);
	} catch (error) {
		console.error("[NOTIFICATIONS_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}

export async function DELETE(_request: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		await prisma.notification.deleteMany({
			where: { user_id: userId },
		});

		return NextResponse.json({ message: "Read notifications cleared" });
	} catch (error) {
		console.error("[NOTIFICATIONS_DELETE]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
