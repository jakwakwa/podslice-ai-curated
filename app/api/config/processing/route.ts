import { NextResponse } from "next/server";
import { getProcessingLimits } from "@/config/processing-limits";

/**
 * API endpoint to expose client-safe processing configuration.
 * This allows the frontend to dynamically adjust UI and validation rules
 * based on the current environment's processing capabilities.
 */
export async function GET() {
	try {
		const config = getProcessingLimits();

		// Only expose values that are safe and necessary for the client
		const clientSafeConfig = {
			maxVideoDurationMinutes: config.maxVideoDurationMinutes,
		};

		return NextResponse.json(clientSafeConfig);
	} catch (error) {
		console.error("[API_CONFIG_PROCESSING_GET]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
