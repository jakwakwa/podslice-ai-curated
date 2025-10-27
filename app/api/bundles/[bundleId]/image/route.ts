import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET endpoint to serve bundle images from database
 * Public endpoint - no authentication required for viewing bundle images
 */
export async function GET(
	_request: Request,
	{ params }: { params: { bundleId: string } }
): Promise<Response> {
	try {
		const { bundleId } = params;

		if (!bundleId) {
			return new NextResponse("Bundle ID is required", { status: 400 });
		}

		// Fetch bundle with image data
		const bundle = await prisma.bundle.findUnique({
			where: { bundle_id: bundleId },
			select: {
				image_data: true,
				image_type: true,
				name: true,
			},
		});

		if (!bundle) {
			return new NextResponse("Bundle not found", { status: 404 });
		}

		if (!(bundle.image_data && bundle.image_type)) {
			return new NextResponse("No image available for this bundle", { status: 404 });
		}

		// Return image with appropriate headers
		return new NextResponse(bundle.image_data, {
			status: 200,
			headers: {
				"Content-Type": bundle.image_type,
				"Cache-Control": "public, max-age=31536000, immutable",
				"Content-Disposition": `inline; filename="${bundleId}.${getExtensionFromMimeType(bundle.image_type)}"`,
			},
		});
	} catch (error) {
		console.error("[BUNDLE_IMAGE_GET] Error:", error);
		return new NextResponse("Internal server error", { status: 500 });
	}
}

/**
 * Helper function to get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
	const map: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/jpg": "jpg",
		"image/png": "png",
		"image/webp": "webp",
		"image/gif": "gif",
	};
	return map[mimeType] || "jpg";
}
