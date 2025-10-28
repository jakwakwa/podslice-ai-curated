import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute for image uploads

/**
 * POST endpoint for uploading bundle images
 * Stores images directly in the database as binary data
 * Requires admin authentication
 */
export async function POST(request: Request): Promise<Response> {
	try {
		// Check admin access
		const adminCheck = await requireAdminMiddleware();
		if (adminCheck) {
			return adminCheck;
		}

		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const bundleId = formData.get("bundleId") as string | null;

		// Validate required fields
		if (!file) {
			return NextResponse.json({ message: "No image file provided" }, { status: 400 });
		}

		// Validate file is an image
		if (!file.type.startsWith("image/")) {
			return NextResponse.json({ message: "File must be an image" }, { status: 400 });
		}

		// Validate image type
		const validImageTypes = [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/webp",
			"image/gif",
		];
		if (!validImageTypes.includes(file.type)) {
			return NextResponse.json(
				{
					message: `Invalid image type: ${file.type}. Supported types: ${validImageTypes.join(", ")}`,
				},
				{ status: 400 }
			);
		}

		// Validate file size (max 5MB for images)
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (file.size > maxSize) {
			return NextResponse.json(
				{ message: "Image file must be less than 5MB" },
				{ status: 400 }
			);
		}

		console.log("[BUNDLE_IMAGE_UPLOAD] Request received", {
			fileName: file.name,
			fileType: file.type,
			fileSize: file.size,
			bundleId: bundleId || "new-bundle",
		});

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// If bundleId is provided, update existing bundle
		if (bundleId) {
			// Verify bundle exists
			const existingBundle = await prisma.bundle.findUnique({
				where: { bundle_id: bundleId },
			});

			if (!existingBundle) {
				return NextResponse.json({ message: "Bundle not found" }, { status: 404 });
			}

			// Update bundle with image data
			await prisma.bundle.update({
				where: { bundle_id: bundleId },
				data: {
					image_data: buffer,
					image_type: file.type,
				},
			});

			const imageUrl = `/api/bundles/${bundleId}/image`;

			console.log("[BUNDLE_IMAGE_UPLOAD] Updated existing bundle", {
				bundleId,
				imageSize: buffer.length,
				url: imageUrl,
			});

			return NextResponse.json({
				success: true,
				url: imageUrl,
				bundleId,
				message: "Image uploaded successfully",
			});
		} else {
			// For new bundles, return base64 data for preview
			// The actual save will happen when the bundle is created
			const base64 = buffer.toString("base64");
			const dataUrl = `data:${file.type};base64,${base64}`;

			console.log("[BUNDLE_IMAGE_UPLOAD] Temporary image prepared", {
				imageSize: buffer.length,
				contentType: file.type,
			});

			return NextResponse.json({
				success: true,
				dataUrl,
				imageData: base64,
				imageType: file.type,
				message: "Image prepared for upload",
			});
		}
	} catch (error) {
		console.error("[BUNDLE_IMAGE_UPLOAD] Error:", error);

		if (error instanceof Error) {
			if (
				error.message.includes("Organization role required") ||
				error.message === "Admin access required"
			) {
				return NextResponse.json({ message: "Admin access required" }, { status: 403 });
			}

			return NextResponse.json({ message: error.message }, { status: 500 });
		}

		return NextResponse.json({ message: "Internal server error" }, { status: 500 });
	}
}
