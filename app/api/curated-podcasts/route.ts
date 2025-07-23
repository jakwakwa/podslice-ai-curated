import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
	// biome-ignore lint/correctness/noUnusedFunctionParameters: expected unused parameter
	request: Request
) {
	try {
		const { userId } = await auth()

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 })
		}

		const curatedPodcasts = await prisma.podcast.findMany({
			where: {
				isActive: true,
				ownerUserId: null, // Only show global podcasts, not user-owned ones
			},
			orderBy: { name: "asc" },
		})

		return NextResponse.json(curatedPodcasts)
	} catch (error) {
		console.error("[CURATED_PODCASTS_GET]", error)
		return new NextResponse("Internal Error", { status: 500 })
	}
}
