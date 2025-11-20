import type { EventEntity } from "@paddle/paddle-node-sdk";
import type { NextRequest } from "next/server";
import { getPaddleInstance } from "@/utils/paddle/get-paddle-instance";
import { ProcessWebhook } from "@/utils/paddle/process-webhook";

export async function POST(request: NextRequest) {
	const signature = request.headers.get("paddle-signature") || "";
	const rawRequestBody = await request.text();
	const privateKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET || "";

	// 1. Validation
	if (!(signature && rawRequestBody && privateKey)) {
		console.error("[Paddle Webhook] Bad Request - Missing components");
		return Response.json(
			{ error: "Missing signature, body, or secret" },
			{ status: 400 }
		);
	}

	const paddle = getPaddleInstance();
	let eventData: EventEntity | undefined;

	// 2. Verification (Isolated)
	try {
		eventData = await paddle.webhooks.unmarshal(rawRequestBody, privateKey, signature);
	} catch (e) {
		console.error("[Paddle Webhook] Signature Verification Failed:", e);
		return Response.json({ error: "Signature verification failed" }, { status: 401 });
	}

	// 3. Processing (Isolated)
	if (eventData) {
		const eventName = eventData.eventType;
		try {
			const webhookProcessor = new ProcessWebhook();
			await webhookProcessor.processEvent(eventData);
			return Response.json({ status: 200, eventName });
		} catch (e) {
			console.error(`[Paddle Webhook] Processing Failed for ${eventName}:`, e);
			// Return 200 to Paddle to prevent retries if it's a logic error,
			// or 500 if you want Paddle to retry. usually 500 is better for temporary DB issues.
			return Response.json({ error: "Event processing failed" }, { status: 500 });
		}
	}

	return Response.json({ status: 200, eventName: "Unknown" });
}
