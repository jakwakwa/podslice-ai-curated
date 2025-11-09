import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { listEventTypes } from "@/lib/paddle-server/paddle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const result = await listEventTypes();

		return NextResponse.json(result);
	} catch (error) {
		console.error("[PADDLE_EVENT_TYPES]", error);
		return NextResponse.json({ error: "Failed to fetch event types" }, { status: 500 });
	}
}
