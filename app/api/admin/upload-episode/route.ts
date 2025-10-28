import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdminMiddleware } from "@/lib/admin-middleware";
import { ensureBucketName, getStorageUploader } from "../../../../lib/inngest/utils/gcs";
import { prisma } from "../../../../lib/prisma";
import { withUploadTimeout } from "../../../../lib/utils";

// Force this API route to be dynamic since it uses auth()
// export const dynamic = "force-dynamic"
export const runtime = "nodejs"; // Required for file system access
export const maxDuration = 300; // 5 minutes for file uploads

async function uploadContentToBucket(data: Buffer, destinationFileName: string) {
	const start = Date.now();
	try {
		if (!Buffer.isBuffer(data)) throw new Error("Invalid data: not a Buffer");
		if (data.length === 0) throw new Error("Empty buffer: nothing to upload");
		const storage = getStorageUploader();
		const bucketName = ensureBucketName();
		const [exists] = await storage.bucket(bucketName).exists();
		if (!exists) {
			console.error("[ADMIN_GCS_UPLOAD] Bucket missing", { bucketName });
			throw new Error(`Bucket ${bucketName} does not exist`);
		}
		await withUploadTimeout(storage.bucket(bucketName).file(destinationFileName).save(data, { resumable: false }));
		console.log("[ADMIN_GCS_UPLOAD] success", { file: destinationFileName, bytes: data.length, ms: Date.now() - start });
		return { success: true, fileName: destinationFileName };
	} catch (error) {
		const err = error as Error & { code?: string };
		const possibleCode = typeof (err as { code?: unknown }).code === "string" ? (err as { code?: string }).code : undefined;
		console.error("[ADMIN_GCS_UPLOAD] fail", { file: destinationFileName, bytes: Buffer.isBuffer(data) ? data.length : undefined, err: err.message, code: possibleCode });
		throw new Error("Failed to upload content");
	}
}

export async function POST(request: Request) {
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

		const formData = await request.formData();
		const bundleId = (formData.get("bundleId") as string) || "";
		const title = formData.get("title") as string;
		const description = formData.get("description") as string;
		const image_url = formData.get("image_url") as string | null;
		const file = formData.get("file") as File;
		const audioUrl = formData.get("audioUrl") as string | null;
		const providedPodcastId = (formData.get("podcastId") as string) || "";

		console.log("Upload episode request:", {
			bundleId,
			title,
			hasDescription: !!description,
			hasImageUrl: !!image_url,
			hasFile: !!file,
			hasAudioUrl: !!audioUrl,
			fileName: file?.name,
		});

		// Validate that either file or audioUrl is provided
		if (!(title && (file || audioUrl))) {
			console.log("Validation failed:", {
				title: !!title,
				file: !!file,
				audioUrl: !!audioUrl,
			});
			return NextResponse.json(
				{
					message: "Missing required fields. Please provide either a file upload or an audio URL.",
				},
				{ status: 400 }
			);
		}

		// Optional bundle context
		const bundle = bundleId
			? await prisma.bundle.findUnique({
					where: { bundle_id: bundleId },
					include: { bundle_podcast: { include: { podcast: true } } },
				})
			: null;

		let finalAudioUrl: string;

		// Handle file upload to GCS
		if (file) {
			// Convert file to buffer
			const buffer = Buffer.from(await file.arrayBuffer());

			// Generate filename following the same pattern as functions.ts
			const audioFileName = `podcasts/${bundleId}-${Date.now()}.mp3`;

			// Upload to the same Google Cloud Storage bucket
			const uploadResult = await uploadContentToBucket(buffer, audioFileName);

			if (!uploadResult.success) {
				return NextResponse.json({ message: "Failed to upload file to storage" }, { status: 500 });
			}

			// Create the full URL following the same pattern as functions.ts
			finalAudioUrl = `https://storage.cloud.google.com/${ensureBucketName()}/${audioFileName}`;
		} else {
			// Use the provided audio URL directly
			finalAudioUrl = audioUrl!;
		}

		// Create episode in DB and enforce membership linking in a single transaction
		const currentWeek = new Date();
		currentWeek.setHours(0, 0, 0, 0); // Start of day

		// Determine final podcast id: prefer explicit podcastId, else default to first in bundle
		const firstPodcast = bundle?.bundle_podcast?.[0]?.podcast;
		const finalPodcastId = providedPodcastId || firstPodcast?.podcast_id || "";

		if (!finalPodcastId) {
			return NextResponse.json({ message: "podcastId is required, or the selected bundle must include at least one podcast" }, { status: 400 });
		}

		// If both bundle and podcast provided, ensure membership
		if (bundle && providedPodcastId) {
			const isMember = bundle.bundle_podcast.some(bp => bp.podcast_id === providedPodcastId);
			if (!isMember) {
				return NextResponse.json({ message: "Selected podcast is not in the chosen bundle" }, { status: 400 });
			}
		}

		console.log("Creating episode with:", {
			title,
			audioUrl: finalAudioUrl,
			bundleId: bundleId || undefined,
			podcastId: finalPodcastId,
			hasFirstPodcast: !!firstPodcast,
		});

		const txResults = await prisma.$transaction([
			// Do not auto-create membership here; rely on existing relationships and validation above
			// Create the episode with both podcast_id and bundle_id (bundle_id is for diagnostics only; reads remain membership-based)
			prisma.episode.create({
				data: {
					episode_id: `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					title,
					description: description || "",
					audio_url: finalAudioUrl,
					image_url: image_url || null,
					published_at: new Date(),
					week_nr: currentWeek,
					bundle_id: null,
					podcast_id: finalPodcastId,
				},
			}),
		]);

		const episode = txResults[txResults.length - 1] as Awaited<ReturnType<typeof prisma.episode.create>>;

		console.log("Episode created successfully:", episode.episode_id);

		return NextResponse.json({
			success: true,
			episode,
			message: "Episode uploaded successfully",
		});
	} catch (error) {
		console.error("Error uploading episode:", error);

		if (error instanceof Error && (error.message.includes("Organization role required") || error.message === "Admin access required")) {
			return NextResponse.json({ message: "Admin access required" }, { status: 403 });
		}

		return NextResponse.json({ message: "Internal server error" }, { status: 500 });
	}
}
