import { getStorageUploader } from "@/lib/gcs/utils/gcs";
import { extractAudioDuration } from "@/lib/inngest/utils/audio-metadata";
import { prisma } from "@/lib/prisma";

type ParsedGcs = { bucket: string; filePath: string };

function parseGcsUrl(rawUrl: string): ParsedGcs | null {
	try {
		const url = new URL(rawUrl);
		const host = url.hostname;
		const path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

		// gs://bucket/path
		if (rawUrl.startsWith("gs://")) {
			const withoutScheme = rawUrl.slice("gs://".length);
			const firstSlash = withoutScheme.indexOf("/");
			if (firstSlash === -1) return null;
			return { bucket: withoutScheme.slice(0, firstSlash), filePath: withoutScheme.slice(firstSlash + 1) };
		}

		// https://storage.googleapis.com/bucket/path or https://storage.cloud.google.com/bucket/path
		if (host === "storage.googleapis.com" || host === "storage.cloud.google.com") {
			const firstSlash = path.indexOf("/");
			if (firstSlash === -1) return null;
			return { bucket: path.slice(0, firstSlash), filePath: decodeURIComponent(path.slice(firstSlash + 1)) };
		}

		// https://<bucket>.storage.googleapis.com/path
		if (host.endsWith(".storage.googleapis.com")) {
			const bucket = host.replace(".storage.googleapis.com", "");
			return { bucket, filePath: decodeURIComponent(path) };
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Extract duration from existing audio files stored in GCS
 */
export async function extractDurationFromGCSFile(gcsUrl: string): Promise<number | null> {
	try {
		// Parse GCS URL (supports gs:// and HTTPS GCS URL variants)
		const parsed = parseGcsUrl(gcsUrl);
		if (!parsed) {
			console.warn(`Not a GCS URL, skipping: ${gcsUrl}`);
			return null;
		}
		const { bucket: bucketName, filePath } = parsed;

		console.log(`Downloading audio file from GCS: ${bucketName}/${filePath}`);

		const uploader = getStorageUploader();
		const file = uploader.bucket(bucketName).file(filePath);

		// Check if file exists
		const [exists] = await file.exists();
		if (!exists) {
			console.warn(`File does not exist: ${gcsUrl}`);
			return null;
		}

		// If WAV, download only the header and extract from header
		if (filePath.toLowerCase().endsWith(".wav")) {
			const headerBuffer: Buffer = await new Promise((resolve, reject) => {
				const chunks: Buffer[] = [];
				file
					.createReadStream({ start: 0, end: 255 })
					.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
					.on("error", reject)
					.on("end", () => resolve(Buffer.concat(chunks)));
			});

			const duration = extractAudioDuration(headerBuffer, "audio/wav");
			console.log(`Extracted duration for ${filePath}: ${duration ? `${duration}s` : "unknown"}`);
			return duration;
		}

		// For non-WAV (e.g., MP3), attempt metadata first
		try {
			console.log(`Reading object metadata for ${filePath}...`);
			const [meta] = await file.getMetadata();
			const custom = meta.metadata || {};
			const candidates = [custom.duration_seconds, custom.durationSeconds, custom.duration, custom.audio_duration_seconds, custom.audioDurationSeconds];
			for (const v of candidates) {
				const n = typeof v === "string" ? Number.parseInt(v, 10) : typeof v === "number" ? v : NaN;
				if (Number.isFinite(n) && n > 0) {
					console.log(`Using custom metadata duration for ${filePath}: ${n}s`);
					return n;
				}
			}
			console.log(`No usable duration in metadata for ${filePath}`);
		} catch (e) {
			console.warn(`Failed to read metadata for ${filePath}`, e);
		}

		// Parse duration from stream using music-metadata for MP3/others with timeout guard
		try {
			console.log(`Parsing duration via music-metadata for ${filePath}...`);
			const mm = await import("music-metadata");
			const stream = file.createReadStream();
			const parsePromise = mm.parseStream(stream, undefined, { duration: true });
			const timeoutMs = 10000;
			const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("parse timeout")), timeoutMs));
			const metadata = await Promise.race([parsePromise, timeoutPromise]);
			try {
				stream.destroy();
			} catch {}
			const seconds =
				(metadata as { format?: { duration?: number } }).format?.duration && Number.isFinite((metadata as { format?: { duration?: number } }).format?.duration)
					? Math.round((metadata as { format?: { duration?: number } }).format?.duration!)
					: null;
			if (seconds && seconds > 0) {
				console.log(`Extracted duration via music-metadata for ${filePath}: ${seconds}s`);
				return seconds;
			}
			console.warn(`music-metadata returned no duration for ${filePath}`);
		} catch (e) {
			console.warn(`music-metadata failed for ${filePath}`, e);
		}

		// Fallback: unsupported type
		console.warn(`Unsupported audio format for duration extraction: ${filePath}`);
		return null;
	} catch (error) {
		console.error(`Failed to extract duration from ${gcsUrl}:`, error);
		return null;
	}
}

/**
 * Update duration for all UserEpisodes that have missing duration_seconds
 */
export async function updateMissingUserEpisodeDurations(): Promise<{ updated: number; failed: number }> {
	const episodesWithoutDuration = await prisma.userEpisode.findMany({
		where: {
			gcs_audio_url: { not: null },
			duration_seconds: null,
			status: "COMPLETED",
		},
		select: {
			episode_id: true,
			gcs_audio_url: true,
			episode_title: true,
		},
	});

	console.log(`Found ${episodesWithoutDuration.length} user episodes without duration`);

	let updated = 0;
	let failed = 0;

	for (const episode of episodesWithoutDuration) {
		if (!episode.gcs_audio_url) continue;

		console.log(`Processing episode: ${episode.episode_title}`);

		const duration = await extractDurationFromGCSFile(episode.gcs_audio_url);

		if (duration !== null && duration > 0) {
			await prisma.userEpisode.update({
				where: { episode_id: episode.episode_id },
				data: { duration_seconds: duration },
			});
			updated++;
			console.log(`✅ Updated duration for "${episode.episode_title}": ${duration}s`);
		} else {
			failed++;
			console.log(`❌ Failed to extract duration for "${episode.episode_title}"`);
		}
	}

	return { updated, failed };
}

/**
 * Update duration for all Episodes that have missing duration_seconds
 */
export async function updateMissingEpisodeDurations(): Promise<{ updated: number; failed: number }> {
	const episodesWithoutDuration = await prisma.episode.findMany({
		where: {
			duration_seconds: null,
		},
		select: {
			episode_id: true,
			audio_url: true,
			title: true,
		},
		take: 50, // Limit to avoid timeout, can run multiple times
	});

	console.log(`Found ${episodesWithoutDuration.length} regular episodes without duration`);

	let updated = 0;
	let failed = 0;

	for (const episode of episodesWithoutDuration) {
		console.log(`Processing episode: ${episode.title}`);

		// Proceed only if the audio URL points to a GCS object we can access
		if (!parseGcsUrl(episode.audio_url)) {
			console.log(`⏭️ Skipping non-GCS URL: ${episode.audio_url}`);
			failed++;
			continue;
		}

		const duration = await extractDurationFromGCSFile(episode.audio_url);

		if (duration !== null && duration > 0) {
			await prisma.episode.update({
				where: { episode_id: episode.episode_id },
				data: { duration_seconds: duration },
			});
			updated++;
			console.log(`✅ Updated duration for "${episode.title}": ${duration}s`);
		} else {
			failed++;
			console.log(`❌ Failed to extract duration for "${episode.title}"`);
		}
	}

	return { updated, failed };
}

/**
 * Extract duration for a single user episode
 */
export async function extractUserEpisodeDuration(episodeId: string): Promise<{ success: boolean; duration?: number; error?: string }> {
	try {
		const episode = await prisma.userEpisode.findUnique({
			where: { episode_id: episodeId },
			select: {
				episode_id: true,
				gcs_audio_url: true,
				episode_title: true,
				duration_seconds: true,
			},
		});

		if (!episode) {
			return { success: false, error: "Episode not found" };
		}

		if (!episode.gcs_audio_url) {
			return { success: false, error: "No audio URL available" };
		}

		if (episode.duration_seconds !== null) {
			return { success: true, duration: episode.duration_seconds };
		}

		console.log(`Extracting duration for user episode: ${episode.episode_title}`);
		const duration = await extractDurationFromGCSFile(episode.gcs_audio_url);

		if (duration !== null && duration > 0) {
			await prisma.userEpisode.update({
				where: { episode_id: episodeId },
				data: { duration_seconds: duration },
			});
			console.log(`✅ Updated duration for "${episode.episode_title}": ${duration}s`);
			return { success: true, duration };
		} else {
			console.log(`❌ Failed to extract duration for "${episode.episode_title}"`);
			return { success: false, error: "Could not extract duration from audio file" };
		}
	} catch (error) {
		console.error(`Failed to extract duration for episode ${episodeId}:`, error);
		return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
	}
}
