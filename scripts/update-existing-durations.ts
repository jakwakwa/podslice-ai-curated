#!/usr/bin/env tsx

import { extractDurationFromGCSFile } from "@/app/(protected)/admin/audio-duration/duration-extractor";
import { getStorageUploader } from "@/lib/inngest/utils/gcs";
import { prisma } from "@/lib/prisma";

type ParsedGcs = { bucket: string; filePath: string };

function parseGcsUrl(rawUrl: string): ParsedGcs | null {
	try {
		const url = new URL(rawUrl);
		const host = url.hostname;
		const path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

		if (rawUrl.startsWith("gs://")) {
			const withoutScheme = rawUrl.slice("gs://".length);
			const firstSlash = withoutScheme.indexOf("/");
			if (firstSlash === -1) return null;
			return {
				bucket: withoutScheme.slice(0, firstSlash),
				filePath: withoutScheme.slice(firstSlash + 1),
			};
		}

		if (host === "storage.googleapis.com" || host === "storage.cloud.google.com") {
			const firstSlash = path.indexOf("/");
			if (firstSlash === -1) return null;
			return {
				bucket: path.slice(0, firstSlash),
				filePath: decodeURIComponent(path.slice(firstSlash + 1)),
			};
		}

		if (host.endsWith(".storage.googleapis.com")) {
			const bucket = host.replace(".storage.googleapis.com", "");
			return { bucket, filePath: decodeURIComponent(path) };
		}

		return null;
	} catch {
		return null;
	}
}

async function updateGcsMetadata(gcsUrl: string, duration: number): Promise<void> {
	const parsed = parseGcsUrl(gcsUrl);
	if (!parsed) {
		console.warn(`Cannot parse GCS URL: ${gcsUrl}`);
		return;
	}

	const uploader = getStorageUploader();
	const file = uploader.bucket(parsed.bucket).file(parsed.filePath);
	await file.setMetadata({ metadata: { duration_seconds: duration.toString() } });
}

async function updateUserEpisodes(): Promise<{ updated: number; failed: number }> {
	const episodes = await prisma.userEpisode.findMany({
		where: { gcs_audio_url: { not: null }, duration_seconds: null, status: "COMPLETED" },
		select: { episode_id: true, gcs_audio_url: true, episode_title: true },
		cacheStrategy: {
			swr: 60,
		},
	});

	let updated = 0;
	let failed = 0;
	for (const ep of episodes) {
		if (!ep.gcs_audio_url) continue;
		const duration = await extractDurationFromGCSFile(ep.gcs_audio_url);
		if (duration && duration > 0) {
			await prisma.userEpisode.update({
				where: { episode_id: ep.episode_id },
				data: { duration_seconds: duration },
			});
			await updateGcsMetadata(ep.gcs_audio_url, duration);
			updated++;
			console.log(`✅ UserEpisode updated: ${ep.episode_title} (${duration}s)`);
		} else {
			failed++;
			console.log(`❌ Failed to extract duration: ${ep.episode_title}`);
		}
	}
	return { updated, failed };
}

async function updateRegularEpisodes(): Promise<{ updated: number; failed: number }> {
	const episodes = await prisma.episode.findMany({
		where: { duration_seconds: null },
		select: { episode_id: true, audio_url: true, title: true },
		take: 200,
	});

	let updated = 0;
	let failed = 0;
	for (const ep of episodes) {
		const parsed = parseGcsUrl(ep.audio_url);
		if (!parsed) {
			console.log(`⏭️ Skipping non-GCS URL: ${ep.audio_url}`);
			failed++;
			continue;
		}
		const duration = await extractDurationFromGCSFile(ep.audio_url);
		if (duration && duration > 0) {
			await prisma.episode.update({
				where: { episode_id: ep.episode_id },
				data: { duration_seconds: duration },
			});
			await updateGcsMetadata(ep.audio_url, duration);
			updated++;
			console.log(`✅ Episode updated: ${ep.title} (${duration}s)`);
		} else {
			failed++;
			console.log(`❌ Failed to extract duration: ${ep.title}`);
		}
	}
	return { updated, failed };
}

async function main() {
	const arg = (process.argv[2] || "all") as "user-episodes" | "episodes" | "all";
	console.log(`Running duration backfill: ${arg}`);
	try {
		if (arg === "user-episodes" || arg === "all") {
			const r = await updateUserEpisodes();
			console.log(`UserEpisodes: ${r.updated} updated, ${r.failed} failed`);
		}
		if (arg === "episodes" || arg === "all") {
			const r = await updateRegularEpisodes();
			console.log(`Episodes: ${r.updated} updated, ${r.failed} failed`);
		}
	} catch (e) {
		console.error(e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
