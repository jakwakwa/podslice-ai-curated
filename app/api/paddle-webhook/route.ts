import type { EventEntity } from "@paddle/paddle-node-sdk";
import type { NextRequest } from "next/server";
import { getPaddleInstance } from "@/utils/paddle/get-paddle-instance";
import { ProcessWebhook } from "@/utils/paddle/process-webhook";

const webhookProcessor = new ProcessWebhook();

export async function POST(request: NextRequest) {
	try {
		// 1. Get the Paddle-Signature header
		const signature = request.headers.get("paddle-signature");

		if (!signature) {
			console.error("[PADDLE_WEBHOOK] Missing Paddle-Signature header");
			return Response.json({ error: "Missing signature from header" }, { status: 400 });
		}

		// 2. Get the raw request body - CRITICAL: Do not transform or parse it
		const rawRequestBody = await request.text();

		if (!rawRequestBody) {
			console.error("[PADDLE_WEBHOOK] Missing request body");
			return Response.json({ error: "Missing request body" }, { status: 400 });
		}

		// 3. Get the webhook secret key
		const secretKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;

		if (!secretKey) {
			console.error(
				"[PADDLE_WEBHOOK] PADDLE_NOTIFICATION_WEBHOOK_SECRET environment variable is not set"
			);
			return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
		}

		// Debug logging
		console.log("[PADDLE_WEBHOOK] Verifying webhook signature:", {
			signatureLength: signature.length,
			secretKeyPrefix: `${secretKey.substring(0, 15)}...`,
			bodyLength: rawRequestBody.length,
		});

		// 4. Verify the webhook using Paddle SDK
		const paddle = getPaddleInstance();

		let eventData: EventEntity | null = null;
		try {
			// Use Paddle SDK to unmarshal and verify the webhook
			eventData = await paddle.webhooks.unmarshal(rawRequestBody, secretKey, signature);
		} catch (verifyError) {
			const err = verifyError as Error;
			console.error("[PADDLE_WEBHOOK] Signature verification failed:", {
				error: err.message,
				signatureSample: signature.substring(0, 50),
				secretSample: `${secretKey.substring(0, 20)}...`,
			});
			return Response.json({ error: "Signature verification failed" }, { status: 401 });
		}

		if (!eventData) {
			console.error("[PADDLE_WEBHOOK] No event data returned from unmarshal");
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
