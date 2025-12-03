import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { getAllTemplates } from "@/src/emails";

export const runtime = "nodejs";

export async function GET() {
	try {
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const templates = getAllTemplates().map(t => ({
			slug: t.slug,
			displayName: t.displayName,
			description: t.description,
		}));

		return NextResponse.json({ templates });
	} catch (error) {
		console.error("[ADMIN_EMAIL_TEMPLATES_GET]", error);
		return NextResponse.json(
			{ message: "Failed to fetch email templates" },
			{ status: 500 }
		);
	}
}
