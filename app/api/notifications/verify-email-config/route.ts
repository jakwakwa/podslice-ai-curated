import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdminMiddleware } from "@/lib/admin-middleware";

// Force this API route to be dynamic since it uses auth()
// export const dynamic = "force-dynamic"

export async function GET() {
	try {
		// First check admin status
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck; // Return error response if not admin
		}

		// If we get here, user is admin
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		// Check environment variables for Resend
		const config = {
			hasResendKey: !!process.env.RESEND_API_KEY,
			hasFrom: !!process.env.EMAIL_FROM,
			hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
			from: process.env.EMAIL_FROM,
		};

		console.log("Email config verification:", config);

		// Check if all required variables are present
		if (!(config.hasResendKey && config.hasFrom)) {
			return NextResponse.json({
				success: false,
				error: "Missing RESEND_API_KEY or EMAIL_FROM",
				config,
			});
		}

		// Try to instantiate Resend client
		try {
			const client = new Resend(process.env.RESEND_API_KEY as string);
			void client;
			return NextResponse.json({
				success: true,
				message: "Resend configuration appears valid",
				config,
			});
		} catch (resendError) {
			console.error("Resend client error:", resendError);
			return NextResponse.json({
				success: false,
				error: "Failed to initialize Resend client",
				details: resendError instanceof Error ? resendError.message : String(resendError),
				config,
			});
		}
	} catch (error) {
		console.error("Email config verification error:", error);

		if (error instanceof Error && error.message.includes("Admin access required")) {
			return NextResponse.json({ error: "Admin access required" }, { status: 403 });
		}

		return NextResponse.json({
			success: false,
			error: "Failed to verify email configuration",
			details: error instanceof Error ? error.message : String(error),
		});
	}
}
