import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UserConfigSchema = z.object({
	topic: z.string().nullable(),
	rss_feed_url: z.string().nullable(),
	api1_url: z.string().url().nullable().optional(),
	api2_url: z.string().url().nullable().optional(),
});

export async function GET() {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Get user ingestion config from database
		const config = await prisma.userIngestionConfig.findUnique({
			where: { user_id: userId },
		});

		// Return null if no config exists yet
		if (!config) {
			return NextResponse.json(null);
		}

		return NextResponse.json({
			id: config.id,
			user_id: config.user_id,
			topic: config.topic,
			rss_feed_url: config.rss_feed_url,
			api1_url: config.api1_url,
			api2_url: config.api2_url,
			is_active: config.is_active,
			created_at: config.created_at,
			updated_at: config.updated_at,
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[USER_CONFIG_GET]", message);
		return new NextResponse("Internal Error", { status: 500 });
	}
}

export async function PUT(request: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const body = await request.json();

		// Validate input with Zod
		const parsed = UserConfigSchema.safeParse(body);
		if (!parsed.success) {
			return new NextResponse(
				JSON.stringify({ error: "Invalid input", details: parsed.error.errors }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		const { topic, rss_feed_url, api1_url, api2_url } = parsed.data;

		// Upsert user config
		const updatedConfig = await prisma.userIngestionConfig.upsert({
			where: { user_id: userId },
			update: {
				topic,
				rss_feed_url,
				api1_url: api1_url ?? null,
				api2_url: api2_url ?? null,
				updated_at: new Date(),
			},
			create: {
				user_id: userId,
				topic,
				rss_feed_url,
				api1_url: api1_url ?? null,
				api2_url: api2_url ?? null,
			},
		});

		return NextResponse.json({
			id: updatedConfig.id,
			user_id: updatedConfig.user_id,
			topic: updatedConfig.topic,
			rss_feed_url: updatedConfig.rss_feed_url,
			api1_url: updatedConfig.api1_url,
			api2_url: updatedConfig.api2_url,
			is_active: updatedConfig.is_active,
			created_at: updatedConfig.created_at,
			updated_at: updatedConfig.updated_at,
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[USER_CONFIG_UPDATE]", message);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
