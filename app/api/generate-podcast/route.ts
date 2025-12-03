import { NextResponse } from "next/server";

// Deprecated: This endpoint previously emitted `podcast/generate-gemini-tts.requested`.
// The Gemini TTS workflow has been replaced by the new admin episode generator.
// Returning 410 so clients know to migrate.

export const maxDuration = 5;

export async function POST() {
	return NextResponse.json(
		{
			error:
				"Deprecated endpoint. Use /api/admin/generate-episode instead (requires admin).",
			status: 410,
		},
		{ status: 410 }
	);
}
