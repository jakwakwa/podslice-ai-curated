import { createHmac, timingSafeEqual } from "node:crypto";
import type { EventEntity } from "@paddle/paddle-node-sdk";
import type { NextRequest } from "next/server";
import { getPaddleInstance } from "@/utils/paddle/get-paddle-instance";
import { ProcessWebhook } from "@/utils/paddle/process-webhook";

const webhookProcessor = new ProcessWebhook();

// Disable body parsing - we need the raw body for signature verification
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
	try {
		// 1. Get the Paddle-Signature header
		const signature = request.headers.get("paddle-signature");
		if (!signature) {
			console.error("[PADDLE_WEBHOOK] Missing Paddle-Signature header");
			return Response.json({ error: "Missing signature from header" }, { status: 400 });
		}

		// 2. Get the raw request body
		const rawRequestBody = await request.text();
		if (!rawRequestBody) {
			console.error("[PADDLE_WEBHOOK] Missing request body");
			return Response.json({ error: "Missing request body" }, { status: 400 });
		}

		// 3. Get the webhook secret key
		const secretKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim();
		if (!secretKey) {
			console.error(
				"[PADDLE_WEBHOOK] PADDLE_NOTIFICATION_WEBHOOK_SECRET environment variable is not set"
			);
			return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
		}
		// Be tolerant about prefix (different Paddle environments may vary)
		if (!secretKey.startsWith("pdl_")) {
			console.warn("[PADDLE_WEBHOOK] Webhook secret does not have expected prefix");
		}

		// 4. Extract fields from Paddle-Signature header robustly
		function parseSignatureHeader(h: string): { ts: string; h1: string } {
			const out: Record<string, string> = {};
			h.split(";").forEach(part => {
				const [k, v] = part.split("=").map(s => s.trim());
				if (k && v) out[k] = v;
			});
			return { ts: out.ts ?? out.t ?? "", h1: out.h1 ?? "" };
		}
		const { ts, h1 } = parseSignatureHeader(signature);
		if (!(ts && h1)) {
			console.error("[PADDLE_WEBHOOK] Invalid Paddle-Signature format");
			return Response.json({ error: "Invalid signature format" }, { status: 400 });
		}

		// Debug logging
		console.log("[PADDLE_WEBHOOK] Manual signature verification:", {
			timestamp: ts,
			h1Signature: h1.substring(0, 20) + "...",
			secretKeyLength: secretKey.length,
			bodyLength: rawRequestBody.length,
		});

		// 5. Check timestamp (optional - prevent replay attacks)
		const timestampMs = Number.parseInt(ts, 10) * 1000;
		if (Number.isNaN(timestampMs)) {
			console.error("[PADDLE_WEBHOOK] Invalid timestamp format");
			return Response.json({ error: "Invalid timestamp" }, { status: 400 });
		}
		if (Date.now() - timestampMs > 5_000) {
			console.warn(
				`[PADDLE_WEBHOOK] Webhook event expired (timestamp is over 5 seconds old): ${timestampMs} vs ${Date.now()}`
			);
			// Warn only; allow processing to continue
		}

		// 6. Build signed payload and compute HMAC SHA256
		const signedPayload = `${ts}:${rawRequestBody}`;
		const computedHmacHex = createHmac("sha256", secretKey).update(signedPayload, "utf8").digest("hex");
		console.log("[PADDLE_WEBHOOK] Computed signature:", {
			computed: computedHmacHex.substring(0, 20) + "...",
			expected: h1.substring(0, 20) + "...",
			match: computedHmacHex === h1,
		});

		// 7. Timing-safe comparison
		try {
			if (
				!timingSafeEqual(Buffer.from(computedHmacHex, "hex"), Buffer.from(h1, "hex"))
			) {
				console.error("[PADDLE_WEBHOOK] Signature verification failed - signatures do not match");
				return Response.json({ error: "Signature verification failed" }, { status: 401 });
			}
		} catch (error) {
			console.error("[PADDLE_WEBHOOK] Error comparing signatures:", error);
			return Response.json({ error: "Signature verification failed" }, { status: 401 });
		}
		console.log("[PADDLE_WEBHOOK] ✅ Signature verification successful!");

		// 8. Parse to typed Paddle Event using SDK (ensures eventType present)
		let eventData: EventEntity | null = null;
		try {
			const paddle = getPaddleInstance();
			eventData = await paddle.webhooks.unmarshal(rawRequestBody, secretKey, signature);
		} catch (err) {
			// Fall back to raw JSON + coerce event_type → eventType for processor
			try {
				const raw = JSON.parse(rawRequestBody) as { eventType?: string; event_type?: string };
				const coerced = { ...raw, eventType: raw.eventType ?? raw.event_type } as EventEntity;
				eventData = coerced;
			} catch (parseErr) {
				console.error("[PADDLE_WEBHOOK] Failed to parse webhook body:", parseErr);
				return Response.json({ error: "Invalid webhook body" }, { status: 400 });
			}
		}
		if (!eventData) {
			console.error("[PADDLE_WEBHOOK] No event data in webhook body");
			return Response.json({ error: "No event data" }, { status: 400 });
		}

		const eventName = eventData.eventType ?? "Unknown event";
		console.log(`[PADDLE_WEBHOOK] Received ${eventName} event`);

		// 9. Optional debug fields
		const eventDataRaw = eventData as unknown as {
			data?: { customer_id?: string; subscription_id?: string; id?: string };
		};
		const customerId = eventDataRaw?.data?.customer_id;
		const subscriptionId = eventDataRaw?.data?.subscription_id || eventDataRaw?.data?.id;
		if (customerId) console.log(`[PADDLE_WEBHOOK] Customer ID: ${customerId}`);
		if (subscriptionId) console.log(`[PADDLE_WEBHOOK] Subscription ID: ${subscriptionId}`);

		// 10. Process
		await webhookProcessor.processEvent(eventData);
		console.log(`[PADDLE_WEBHOOK] Processing completed successfully for ${eventName}`);

		return Response.json({ status: 200, eventName });
	} catch (e) {
		const error = e as Error;
		console.error("[PADDLE_WEBHOOK] Error processing webhook:", {
			message: error.message,
			stack: error.stack,
			name: error.name,
		});
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
