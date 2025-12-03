import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getYouTubeVideoDetails } from "@/lib/inngest/utils/youtube";

const schema = z.object({
	url: z.string().url(),
});

export async function GET(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			console.log("[DEBUG] YouTube metadata API: Unauthorized access");
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const url = searchParams.get("url");
		console.log("[DEBUG] YouTube metadata API called with URL:", url);

		const parsed = schema.safeParse({ url });
		if (!parsed.success) {
			console.log("[DEBUG] YouTube metadata API: Invalid URL schema");
			return new NextResponse(parsed.error.message, { status: 400 });
		}

		const details = await getYouTubeVideoDetails(parsed.data.url);
		console.log(
			"[DEBUG] YouTube metadata API: getYouTubeVideoDetails returned:",
			details
		);

		if (!details) {
			console.log("[DEBUG] YouTube metadata API: No details returned");
			return new NextResponse(
				"Could not retrieve video details. Please check the URL and ensure the API key is valid.",
				{ status: 404 }
			);
		}

		console.log(
			"[DEBUG] YouTube metadata API: Returning details with duration:",
			details.duration
		);
		return NextResponse.json(details);
	} catch (error) {
		console.error("[DEBUG] YouTube metadata API error:", error);
		if (error instanceof Error) {
			return new NextResponse(error.message, { status: 500 });
		}
		return new NextResponse("Internal Error", { status: 500 });
	}
}
