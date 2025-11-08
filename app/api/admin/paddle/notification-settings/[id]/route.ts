import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import {
	deleteNotificationSetting,
	updateNotificationSetting,
} from "@/lib/paddle-server/paddle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateNotificationSettingSchema = z.object({
	description: z.string().min(1).optional(),
	destination: z.string().min(1).optional(),
	active: z.boolean().optional(),
	traffic_source: z.enum(["all", "platform", "simulation"]).optional(),
	subscribed_events: z.array(z.string()).min(1).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
	try {
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const { id } = params;

		if (!id || typeof id !== "string") {
			return NextResponse.json(
				{ error: "Invalid notification setting ID" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const parsed = updateNotificationSettingSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid request body", details: parsed.error.format() },
				{ status: 400 }
			);
		}

		// If updating destination, validate based on the setting type
		// Note: We can't validate type here since we don't have it in the update body
		// Paddle will validate on their end
		if (parsed.data.destination) {
			// Basic validation - Paddle will handle full validation
			if (parsed.data.destination.length === 0) {
				return NextResponse.json(
					{ error: "Destination cannot be empty" },
					{ status: 400 }
				);
			}
		}

		const result = await updateNotificationSetting(id, parsed.data);

		return NextResponse.json(result);
	} catch (error) {
		console.error("[PADDLE_NOTIFICATION_SETTINGS_PATCH]", error);
		return NextResponse.json(
			{ error: "Failed to update notification setting" },
			{ status: 500 }
		);
	}
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	try {
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const { id } = params;

		if (!id || typeof id !== "string") {
			return NextResponse.json(
				{ error: "Invalid notification setting ID" },
				{ status: 400 }
			);
		}

		await deleteNotificationSetting(id);

		return new NextResponse(null, { status: 204 });
	} catch (error) {
		console.error("[PADDLE_NOTIFICATION_SETTINGS_DELETE]", error);
		return NextResponse.json(
			{ error: "Failed to delete notification setting" },
			{ status: 500 }
		);
	}
}
