import type { NextRequest } from "next/server";
import { getPaddleInstance } from "@/utils/paddle/get-paddle-instance";
import { ProcessWebhook } from "@/utils/paddle/process-webhook";

const webhookProcessor = new ProcessWebhook();

const SIGNATURE_ERROR_REGEX = /signature verification failed/i;

export async function POST(request: NextRequest) {
	const signature = request.headers.get("paddle-signature") || "";
	const rawRequestBody = await request.text();
	const privateKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;

	if (!privateKey) {
		console.error("[PADDLE_WEBHOOK] Missing PADDLE_NOTIFICATION_WEBHOOK_SECRET");
		return Response.json({ error: "Webhook secret misconfigured" }, { status: 500 });
	}

	if (!(signature && rawRequestBody)) {
		return Response.json({ error: "Missing signature from header" }, { status: 400 });
	}

	try {
		const paddle = getPaddleInstance();
		let eventData;
		try {
			eventData = await paddle.webhooks.unmarshal(rawRequestBody, privateKey, signature);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error("[PADDLE_WEBHOOK] Signature verification failed", message);
			const isSignatureError =
				error instanceof Error && SIGNATURE_ERROR_REGEX.test(error.message);
			return Response.json(
				{
					error: isSignatureError ? "Invalid webhook signature" : "Unable to verify webhook",
				},
				{ status: isSignatureError ? 400 : 500 }
			);
		}

		const eventName = eventData?.eventType ?? "Unknown event";

		if (eventData) {
			await webhookProcessor.processEvent(eventData);
		}

		return Response.json({ status: 200, eventName });
	} catch (e) {
		console.error("[PADDLE_WEBHOOK] Unexpected failure", e);
		return Response.json({ error: "Internal server error" }, { status: 500 });
	}
}
