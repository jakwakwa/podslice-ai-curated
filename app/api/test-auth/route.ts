import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		console.log("Testing auth...");
		const { userId } = await auth();
		console.log("Auth successful, userId:", userId);

		return NextResponse.json({
			success: true,
			userId,
			message: "Auth is working",
		});
	} catch (error) {
		console.error("Auth error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			},
			{ status: 500 }
		);
	}
}
