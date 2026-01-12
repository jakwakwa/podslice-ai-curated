import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { id } = params;
		if (!id) {
			return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
		}

		const result = await prisma.notification.deleteMany({
			where: { notification_id: id, user_id: userId },
		});

		if (result.count === 0) {
			return NextResponse.json({ error: "Notification not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[NOTIFICATION_DELETE]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
