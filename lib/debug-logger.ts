import { ensureBucketName, getStorageUploader } from "@/lib/inngest/utils/gcs";

const DEBUG_ENABLED = process.env.ENABLE_EPISODE_DEBUG === "true";

export type DebugEvent = {
	step: string;
	status: "start" | "success" | "fail" | "info";
	message?: string;
	provider?: string;
	elapsedMs?: number;
	meta?: Record<string, unknown>;
	timestamp?: string;
};

export async function writeEpisodeDebugLog(episodeId: string, event: DebugEvent): Promise<void> {
	if (!DEBUG_ENABLED) return;
	try {
		const uploader = getStorageUploader();
		const bucket = ensureBucketName();
		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		const objectName = `debug/user-episodes/${episodeId}/logs/${ts}.json`;
		const payload = Buffer.from(JSON.stringify({ ...event, timestamp: new Date().toISOString() }));
		await uploader.bucket(bucket).file(objectName).save(payload, { contentType: "application/json" });
	} catch (error) {
		console.error("[DEBUG_LOG_WRITE]", error);
	}
}

export async function writeEpisodeDebugReport(episodeId: string, content: string): Promise<string | null> {
	if (!DEBUG_ENABLED) return null;
	try {
		const uploader = getStorageUploader();
		const bucket = ensureBucketName();
		const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
		const objectName = `debug/user-episodes/${episodeId}/report-${ts}.md`;
		await uploader.bucket(bucket).file(objectName).save(Buffer.from(content), { contentType: "text/markdown" });
		return `gs://${bucket}/${objectName}`;
	} catch (error) {
		console.error("[DEBUG_REPORT_WRITE]", error);
		return null;
	}
}
