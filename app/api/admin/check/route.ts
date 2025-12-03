import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";

export async function GET() {
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

		return NextResponse.json({
			success: true,
			message: "Admin access confirmed",
			userId,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Admin check error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
