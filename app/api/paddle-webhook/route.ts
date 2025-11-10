import type { NextRequest } from "next/server"
import { getPaddleInstance } from "@/utils/paddle/get-paddle-instance"
import { ProcessWebhook } from "@/utils/paddle/process-webhook"

const webhookProcessor = new ProcessWebhook()

export async function POST(request: NextRequest) {
	const signature = request.headers.get("paddle-signature") || ""
	const rawRequestBody = await request.text()
	const privateKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET || ""

	try {
		if (!(signature && rawRequestBody)) {
			console.error("[PADDLE_WEBHOOK] Missing signature or request body")
			return Response.json({ error: "Missing signature from header" }, { status: 400 })
		}

		const paddle = getPaddleInstance()
		const eventData = await paddle.webhooks.unmarshal(rawRequestBody, privateKey, signature)
		const eventName = eventData?.eventType ?? "Unknown event"

		// Log webhook receipt with event details
		console.log(`[PADDLE_WEBHOOK] Received ${eventName} event`)

		// Extract and log relevant IDs for debugging
		const eventDataRaw = eventData as unknown as { data?: { customer_id?: string; subscription_id?: string; id?: string } }
		const customerId = eventDataRaw?.data?.customer_id
		const subscriptionId = eventDataRaw?.data?.subscription_id || eventDataRaw?.data?.id

		if (customerId) {
			console.log(`[PADDLE_WEBHOOK] Customer ID: ${customerId}`)
		}
		if (subscriptionId) {
			console.log(`[PADDLE_WEBHOOK] Subscription ID: ${subscriptionId}`)
		}

		if (eventData) {
			await webhookProcessor.processEvent(eventData)
			console.log(`[PADDLE_WEBHOOK] Processing completed successfully for ${eventName}`)
		} else {
			console.warn("[PADDLE_WEBHOOK] No event data received")
		}

		return Response.json({ status: 200, eventName })
	} catch (e) {
		const error = e as Error
		console.error("[PADDLE_WEBHOOK] Error processing webhook:", {
			message: error.message,
			stack: error.stack,
			name: error.name
		})
		return Response.json({ error: "Internal server error" }, { status: 500 })
	}
}
