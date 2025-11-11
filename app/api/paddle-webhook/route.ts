import type { EventEntity } from "@paddle/paddle-node-sdk";
import type { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getPaddleInstance } from "@/utils/paddle/get-paddle-instance";
import { ProcessWebhook } from "@/utils/paddle/process-webhook";

const webhookProcessor = new ProcessWebhook();

// Disable body parsing - we need the raw body for signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
	try {
		// 1. Get the Paddle-Signature header
		const signature = request.headers.get("paddle-signature");

		if (!signature) {
			console.error("[PADDLE_WEBHOOK] Missing Paddle-Signature header");
			return Response.json({ error: "Missing signature from header" }, { status: 400 });
		}

		// 2. Get the raw request body - try direct text() method
		const rawRequestBody = await request.text();

		if (!rawRequestBody) {
			console.error("[PADDLE_WEBHOOK] Missing request body");
			return Response.json({ error: "Missing request body" }, { status: 400 });
		}

		// 3. Get the webhook secret key - trim to remove any whitespace/newlines
		const secretKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim();

		if (!secretKey) {
			console.error(
				"[PADDLE_WEBHOOK] PADDLE_NOTIFICATION_WEBHOOK_SECRET environment variable is not set"
			);
			return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
		}

		// Validate secret key format (should start with pdl_ntfset_)
		if (!secretKey.startsWith("pdl_ntfset_")) {
			console.error(
				"[PADDLE_WEBHOOK] Invalid secret key format - should start with pdl_ntfset_"
			);
			return Response.json({ error: "Invalid webhook secret format" }, { status: 500 });
		}

		// 4. Extract timestamp and signature from Paddle-Signature header
		// Format: ts=1671552777;h1=eb4d0dc8853be92b7f063b9f3ba5233eb920a09459b6e6b2c26705b4364db151
		if (!signature.includes(";")) {
			console.error("[PADDLE_WEBHOOK] Invalid Paddle-Signature format");
			return Response.json({ error: "Invalid signature format" }, { status: 400 });
		}

		const parts = signature.split(";");
		if (parts.length !== 2) {
			console.error("[PADDLE_WEBHOOK] Invalid Paddle-Signature format - expected 2 parts");
			return Response.json({ error: "Invalid signature format" }, { status: 400 });
		}

		const [timestampPart, signaturePart] = parts.map(part => part.split("=")[1]);
		if (!timestampPart || !signaturePart) {
			console.error("[PADDLE_WEBHOOK] Unable to extract timestamp or signature");
			return Response.json({ error: "Invalid signature format" }, { status: 400 });
		}

		const timestamp = timestampPart;
		const h1Signature = signaturePart;

		// Debug logging
		console.log("[PADDLE_WEBHOOK] Manual signature verification:", {
			timestamp,
			h1Signature: h1Signature.substring(0, 20) + "...",
			secretKeyLength: secretKey.length,
			bodyLength: rawRequestBody.length,
		});

		// 5. Check timestamp (optional - prevent replay attacks)
		const timestampInt = parseInt(timestamp) * 1000;
		if (isNaN(timestampInt)) {
			console.error("[PADDLE_WEBHOOK] Invalid timestamp format");
			return Response.json({ error: "Invalid timestamp" }, { status: 400 });
		}

		const currentTime = Date.now();
		if (currentTime - timestampInt > 5000) {
			console.warn(`[PADDLE_WEBHOOK] Webhook event expired (timestamp is over 5 seconds old): ${timestampInt} vs ${currentTime}`);
			// Don't reject - just warn for now
		}

		// 6. Build signed payload: timestamp + ":" + raw body
		const signedPayload = `${timestamp}:${rawRequestBody}`;

		// 7. Hash the signed payload using HMAC SHA256
		const hashedPayload = createHmac("sha256", secretKey)
			.update(signedPayload, "utf8")
			.digest("hex");

		console.log("[PADDLE_WEBHOOK] Computed signature:", {
			computed: hashedPayload.substring(0, 20) + "...",
			expected: h1Signature.substring(0, 20) + "...",
			match: hashedPayload === h1Signature,
		});

		// 8. Compare signatures using timing-safe comparison
		try {
			if (!timingSafeEqual(Buffer.from(hashedPayload), Buffer.from(h1Signature))) {
				console.error("[PADDLE_WEBHOOK] Signature verification failed - signatures do not match");
				return Response.json({ error: "Signature verification failed" }, { status: 401 });
			}
		} catch (error) {
			console.error("[PADDLE_WEBHOOK] Error comparing signatures:", error);
			return Response.json({ error: "Signature verification failed" }, { status: 401 });
		}

		console.log("[PADDLE_WEBHOOK] ✅ Signature verification successful!");

		// 9. Parse the webhook body
		let eventData: EventEntity | null = null;
		try {
			const bodyJson = JSON.parse(rawRequestBody);
			
			// Use Paddle SDK to parse the event (but not verify - we already did that)
			const paddle = getPaddleInstance();
			eventData = bodyJson as EventEntity;
		} catch (error) {
			console.error("[PADDLE_WEBHOOK] Failed to parse webhook body:", error);
			return Response.json({ error: "Invalid webhook body" }, { status: 400 });
		}

		if (!eventData) {
			console.error("[PADDLE_WEBHOOK] No event data in webhook body");
			return Response.json({ error: "No event data" }, { status: 400 });
		}

		const eventName = eventData?.eventType ?? "Unknown event";

		// Log webhook receipt with event details
		console.log(`[PADDLE_WEBHOOK] Received ${eventName} event`);

		// Extract and log relevant IDs for debugging
		const eventDataRaw = eventData as unknown as {
			data?: { customer_id?: string; subscription_id?: string; id?: string };
		};
		const customerId = eventDataRaw?.data?.customer_id;
		const subscriptionId = eventDataRaw?.data?.subscription_id || eventDataRaw?.data?.id;

		if (customerId) {
			console.log(`[PADDLE_WEBHOOK] Customer ID: ${customerId}`);
		}
		if (subscriptionId) {
			console.log(`[PADDLE_WEBHOOK] Subscription ID: ${subscriptionId}`);
		}

		if (eventData) {
			await webhookProcessor.processEvent(eventData);
			console.log(`[PADDLE_WEBHOOK] Processing completed successfully for ${eventName}`);
		} else {
			console.warn("[PADDLE_WEBHOOK] No event data received");
		}

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
