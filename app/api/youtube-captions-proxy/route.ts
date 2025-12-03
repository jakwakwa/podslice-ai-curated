import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
	url: z
		.string()
		.url()
		.refine(
			u => {
				try {
					const { hostname, protocol } = new URL(u);
					if (protocol !== "http:" && protocol !== "https:") return false;
					const allowed = ["youtube.com", "googlevideo.com"];
					return allowed.some(base => hostname === base || hostname.endsWith(`.${base}`));
				} catch {
					return false;
				}
			},
			{
				message: "Invalid captions host",
			}
		),
});

export const runtime = "edge";

export async function GET(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return new NextResponse("Unauthorized", { status: 401 });

		const { searchParams } = new URL(request.url);
		const url = searchParams.get("url");
		const parsed = QuerySchema.safeParse({ url });
		if (!parsed.success) return new NextResponse(parsed.error.message, { status: 400 });

		// Fetch XML from YouTube captions endpoint
		const upstream = await fetch(parsed.data.url, {
			headers: {
				"User-Agent": "Mozilla/5.0",
				Referer: "https://www.youtube.com/",
				Origin: "https://www.youtube.com",
			},
			// Prevent Next from caching private user content
			cache: "no-store",
		});

		if (!upstream.ok)
			return new NextResponse(`Upstream error: ${upstream.status}`, { status: 502 });
		const xml = await upstream.text();
		return new NextResponse(xml, {
			status: 200,
			headers: { "content-type": "application/xml; charset=utf-8" },
		});
	} catch (error) {
		console.error("[YOUTUBE_CAPTIONS_PROXY]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
