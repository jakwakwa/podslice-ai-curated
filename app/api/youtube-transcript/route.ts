import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
	url: z.string().url(),
});

export async function GET(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Gate server-side YouTube caption fetching on Vercel by default
		const ENABLE_SERVER_YTDL = process.env.ENABLE_SERVER_YTDL === "true";
		const IS_VERCEL = process.env.VERCEL === "1" || process.env.VERCEL === "true";

		const { searchParams } = new URL(request.url);
		const url = searchParams.get("url");

		const parsed = schema.safeParse({ url });
		if (!parsed.success) {
			return new NextResponse(parsed.error.message, { status: 400 });
		}

		if (IS_VERCEL && !ENABLE_SERVER_YTDL) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Server-side YouTube captions are disabled in this environment. Use client extraction in the browser.",
				},
				{ status: 429 }
			);
		}

		// Transcripts disabled: always respond with 410 Gone
		return NextResponse.json(
			{ success: false, error: "Transcripts disabled: Use generation pipeline." },
			{ status: 410 }
		);
	} catch (error) {
		console.error("[YOUTUBE_TRANSCRIPT_GET]", error);
		if (error instanceof Error) {
			return new NextResponse(error.message, { status: 500 });
		}
		return new NextResponse("Internal Error", { status: 500 });
	}
}
