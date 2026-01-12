import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function requireAdminMiddleware(): Promise<Response | undefined> {
	try {
		const { userId } = await auth();
		if (!userId) return new NextResponse("Unauthorized", { status: 401 });

		const user = await prisma.user.findUnique({
			where: { user_id: userId },
			select: { is_admin: true },
		});

		if (!user?.is_admin) return new NextResponse("Forbidden", { status: 403 });
		return undefined;
	} catch (error) {
		console.error("[ADMIN_MIDDLEWARE]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
