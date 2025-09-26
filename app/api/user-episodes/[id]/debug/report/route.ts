import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { ensureBucketName, getStorageReader } from "@/lib/inngest/utils/gcs";

interface RouteParams {
	params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
	const adminCheck = await requireAdminMiddleware();
	if (adminCheck) return adminCheck;

	try {
		const reader = getStorageReader();
		const bucket = ensureBucketName();
		const prefix = `debug/user-episodes/${params.id}/report-`;
		const [files] = await reader.bucket(bucket).getFiles({ prefix });
		if (files.length === 0) return NextResponse.json({ report: null });
		files.sort((a, b) => (a.name > b.name ? -1 : 1));
		const [buf] = await files[0].download();
		return new NextResponse(buf, { status: 200, headers: { "Content-Type": "text/markdown; charset=utf-8" } });
	} catch (error) {
		console.error("[USER_EPISODE_DEBUG_REPORT]", error);
		return NextResponse.json({ error: "Failed to fetch debug report" }, { status: 500 });
	}
}
