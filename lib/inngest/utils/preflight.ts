// lib/inngest/utils/preflight.ts
import { failure, type Result, success } from "./results";

export type ProbeResult = {
	url: string;
	contentType?: string;
	contentLength?: number;
	suspectedAudio: boolean;
};

export async function preflightProbe(
	url: string,
	timeoutMs = 6000
): Promise<Result<ProbeResult>> {
	try {
		const controller = new AbortController();
		const _t = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const head = await fetch(url, { method: "HEAD", signal: controller.signal });
			const ct = head.headers.get("content-type") || undefined;
			const cl = Number(head.headers.get("content-length") || "0") || undefined;
			if (ct?.startsWith("audio/") && (cl === undefined || cl > 0)) {
				return success({ url, contentType: ct, contentLength: cl, suspectedAudio: true });
			}
		} catch (_err) {
			// HEAD requests may be blocked or not supported; we log and continue to a small GET probe
			// Avoid logging full error details that might contain sensitive information
			console.warn(`HEAD request failed for URL`);
		} finally {
			clearTimeout(_t);
		}

		const controller2 = new AbortController();
		const t2 = setTimeout(() => controller2.abort(), timeoutMs);
		try {
			const range = await fetch(url, {
				method: "GET",
				headers: { Range: "bytes=0-2047", "User-Agent": "Mozilla/5.0" },
				signal: controller2.signal,
			});
			clearTimeout(t2);
			const ct = range.headers.get("content-type") || undefined;
			const buf = Buffer.from(await range.arrayBuffer());
			const startsWithTag = buf
				.toString("utf8", 0, Math.min(buf.length, 32))
				.trimStart()
				.startsWith("<");
			const suspectedAudio = ct?.startsWith("audio/") === true || !startsWithTag;

			// Per project "dos-and-donts": treat watch/watch?v (YouTube) HTML responses as
			// neither fatal nor audio. We want the orchestrator to proceed (captions-first)
			// rather than failing immediately on HTML from YouTube landing pages / consent walls.
			if (!suspectedAudio) {
				if (/youtu\.be|youtube\.com/i.test(url)) {
					return success({
						url,
						contentType: ct,
						contentLength: undefined,
						suspectedAudio: false,
					});
				}
				return failure(
					"invalid_input",
					`Source not audio. content-type: ${ct || "unknown"}`
				);
			}
			return success({ url, contentType: ct, contentLength: undefined, suspectedAudio });
		} finally {
			clearTimeout(t2);
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return failure("unknown", msg);
	}
}
