import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhook/route";

const mockUnmarshal = vi.fn();
const mockProcessEvent = vi.fn();

vi.mock("@/utils/paddle/get-paddle-instance", () => ({
	getPaddleInstance: () => ({
		webhooks: {
			unmarshal: mockUnmarshal,
		},
	}),
}));

vi.mock("@/utils/paddle/process-webhook", () => ({
	ProcessWebhook: vi.fn().mockImplementation(() => ({
		processEvent: mockProcessEvent,
	})),
}));

function buildRequest(body: unknown = { sample: true }, signature = "sig-123") {
	return new NextRequest("http://localhost/api/webhook", {
		method: "POST",
		body: JSON.stringify(body),
		headers: {
			"content-type": "application/json",
			"paddle-signature": signature,
		},
	});
}

describe("POST /api/webhook", () => {
	const originalSecret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;

	beforeEach(() => {
		mockUnmarshal.mockReset();
		mockProcessEvent.mockReset();
		process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET = "test-secret";
	});

	afterEach(() => {
		process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET = originalSecret;
	});

	it("returns 500 when webhook secret is missing", async () => {
		delete process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;

		const res = await POST(buildRequest());
		const payload = await res.json();

		expect(res.status).toBe(500);
		expect(payload.error).toBe("Webhook secret misconfigured");
		expect(mockUnmarshal).not.toHaveBeenCalled();
	});

	it("returns 400 when signature verification fails", async () => {
		mockUnmarshal.mockRejectedValueOnce(new Error("Signature verification failed"));

		const res = await POST(buildRequest());
		const payload = await res.json();

		expect(res.status).toBe(400);
		expect(payload.error).toBe("Invalid webhook signature");
	});

	it("processes events when signature is valid", async () => {
		const event = { eventType: "subscription.created" };
		mockUnmarshal.mockResolvedValueOnce(event);

		const res = await POST(buildRequest({ id: "evt_test" }));
		const payload = await res.json();

		expect(res.status).toBe(200);
		expect(payload.eventName).toBe(event.eventType);
		expect(mockProcessEvent).toHaveBeenCalledWith(event);
	});
});

