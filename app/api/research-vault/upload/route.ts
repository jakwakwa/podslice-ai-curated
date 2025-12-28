import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { ensureBucketName, getStorageUploader } from "@/lib/inngest/utils/gcs"; // Adjusted import path to match discovery

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute for uploads

export async function POST(request: Request): Promise<Response> {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json({ message: "No file provided" }, { status: 400 });
		}

		// Validate file type (PDF, TXT)
		const validTypes = ["application/pdf", "text/plain"];
		if (!validTypes.includes(file.type)) {
			return NextResponse.json(
				{ message: `Invalid file type: ${file.type}. Supported types: PDF, TXT` },
				{ status: 400 }
			);
		}

		// Validate size (e.g., 20MB max)
		const maxSize = 20 * 1024 * 1024;
		if (file.size > maxSize) {
			return NextResponse.json(
				{ message: "File size must be less than 20MB" },
				{ status: 400 }
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const storage = getStorageUploader();
		const bucketName = ensureBucketName();

		const extension = file.name.split(".").pop() || "bin";
		const fileName = `research-assets/${userId}/${uuidv4()}.${extension}`;

		const bucket = storage.bucket(bucketName);
		const gcsFile = bucket.file(fileName);

		await gcsFile.save(buffer, {
			metadata: {
				contentType: file.type,
			},
		});

		// Construct Public URL
		const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

		return NextResponse.json({
			success: true,
			url: publicUrl,
			fileName: file.name,
		});
	} catch (error) {
		console.error("[RESEARCH_UPLOAD_ERROR]", error);
		return NextResponse.json({ message: "Internal server error" }, { status: 500 });
	}
}
