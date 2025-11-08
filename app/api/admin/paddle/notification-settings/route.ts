import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import {
	createNotificationSetting,
	listNotificationSettings,
} from "@/lib/paddle-server/paddle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createNotificationSettingSchema = z.object({
	description: z.string().min(1, "Description is required"),
	type: z.enum(["url", "email"]),
	destination: z
		.string()
		.min(1, "Destination is required")
		.refine(
			val => {
				// Basic validation - will be validated by Paddle too
				return val.length > 0;
			},
			{ message: "Invalid destination" }
		),
	api_version: z.number().int().positive().default(1),
	include_sensitive_fields: z.boolean().optional().default(false),
	traffic_source: z.enum(["all", "platform", "simulation"]).default("all"),
	subscribed_events: z.array(z.string()).min(1, "At least one event must be subscribed"),
});

export async function GET() {
	try {
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const result = await listNotificationSettings();

		return NextResponse.json(result);
	} catch (error) {
		console.error("[PADDLE_NOTIFICATION_SETTINGS_GET]", error);
		return NextResponse.json(
			{ error: "Failed to fetch notification settings" },
			{ status: 500 }
		);
	}
}

export async function POST(request: Request) {
	try {
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const body = await request.json();
		const parsed = createNotificationSettingSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid request body", details: parsed.error.format() },
				{ status: 400 }
			);
		}

		const { type, destination } = parsed.data;

		// Additional validation based on type
		if (type === "url") {
			try {
				new URL(destination);
			} catch {
				return NextResponse.json(
					{ error: "Invalid URL format for destination" },
					{ status: 400 }
				);
			}
		} else if (type === "email") {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(destination)) {
				return NextResponse.json(
					{ error: "Invalid email format for destination" },
					{ status: 400 }
				);
			}
		}

		const result = await createNotificationSetting(parsed.data);

		// Return the full response including endpoint_secret_key
		// Never log the secret
		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		console.error("[PADDLE_NOTIFICATION_SETTINGS_POST]", error);
		return NextResponse.json(
			{ error: "Failed to create notification setting" },
			{ status: 500 }
		);
	}
}
