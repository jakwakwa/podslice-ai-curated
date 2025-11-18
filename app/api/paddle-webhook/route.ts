import type { NextRequest } from "next/server";
import { getPaddleInstance } from "@/utils/paddle/get-paddle-instance";
import { ProcessWebhook } from "@/utils/paddle/process-webhook";

const webhookProcessor = new ProcessWebhook();

export async function POST(request: NextRequest) {
	const signature = request.headers.get("paddle-signature") || "";
	const rawRequestBody = await request.text();
	const privateKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET || "";

	try {
		if (!signature) {
			console.error("[Paddle Webhook] Missing signature header");
			return Response.json({ error: "Missing signature from header" }, { status: 400 });
		}
		if (!rawRequestBody) {
			console.error("[Paddle Webhook] Empty request body");
			return Response.json({ error: "Empty request body" }, { status: 400 });
		}
		if (!privateKey) {
			console.error(
				"[Paddle Webhook] Missing PADDLE_NOTIFICATION_WEBHOOK_SECRET env var"
			);
			return Response.json({ error: "Server configuration error" }, { status: 500 });
		}

		const paddle = getPaddleInstance();
		// unmarshal returns the EventEntity if successful, or throws if signature is invalid
		const eventData = await paddle.webhooks.unmarshal(
			rawRequestBody,
			privateKey,
			signature
		);
		const eventName = eventData?.eventType ?? "Unknown event";

		if (eventData) {
			await webhookProcessor.processEvent(eventData);
		}

		return Response.json({ status: 200, eventName });
	} catch (e) {
		console.error("[Paddle Webhook] Signature verification failed. Details:");
		console.error(`- Signature Header: ${signature ? "Present" : "Missing"}`);
		console.error(`- Body Length: ${rawRequestBody.length}`);
		console.error(
			`- Secret Key: ${privateKey ? `Present (starts with ${privateKey.substring(0, 4)}...)` : "Missing"}`
		);
		// Don't log the full body or secret for security
		console.error(e);
		return Response.json({ error: "Webhook verification failed" }, { status: 500 });
	}
}
