import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { ensureBucketName, getStorageReader } from "@/lib/inngest/utils/gcs";

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
	const adminCheck = await requireAdminMiddleware();
	if (adminCheck) return adminCheck;

	try {
		const { id } = await params;
		const reader = getStorageReader();
		const bucket = ensureBucketName();
		const prefix = `debug/user-episodes/${id}/logs/`;
		const [files] = await reader.bucket(bucket).getFiles({ prefix });
		files.sort((a, b) => (a.name > b.name ? 1 : -1));
		const events: unknown[] = [];
		for (const f of files) {
			const [buf] = await f.download();
			try {
				events.push(JSON.parse(buf.toString("utf8")));
			} catch {}
		}
		return NextResponse.json({ events });
	} catch (error) {
		console.error("[USER_EPISODE_DEBUG_LOGS]", error);
		return NextResponse.json({ error: "Failed to fetch debug logs" }, { status: 500 });
	}
}
