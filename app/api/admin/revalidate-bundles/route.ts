import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
	const adminCheck = await requireAdminMiddleware();
	if (adminCheck) return adminCheck;

	try {
		// Revalidate curated and shared bundle tags used across pages and APIs
		revalidateTag("curated_bundles");
		revalidateTag("shared_bundles");
		revalidateTag("BundlePanel_in_Admin");
		revalidateTag("Podcast_List_in_Bundles_Panel_in_Admin");

		return NextResponse.json({ ok: true, revalidated: true });
	} catch (error) {
		console.error("[ADMIN_REVALIDATE_BUNDLES]", error);
		return NextResponse.json(
			{ ok: false, error: "Failed to revalidate" },
			{ status: 500 }
		);
	}
}
