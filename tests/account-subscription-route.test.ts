import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/account/subscription/route";
import { prisma } from "@/lib/prisma";
import { createUser } from "./factories";
import { resetDb } from "./test-db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSubscriptionsByCustomer, getTransaction } from "@/lib/paddle-server/paddle";

vi.mock("@clerk/nextjs/server", () => ({
	auth: vi.fn(),
	currentUser: vi.fn(),
}));

vi.mock("@/lib/paddle-server/paddle", () => ({
	getSubscriptionsByCustomer: vi.fn(),
	getTransaction: vi.fn(),
}));

function buildRequest(transactionId: string) {
	return new NextRequest("http://localhost/api/account/subscription", {
		method: "POST",
		body: JSON.stringify({ transactionId }),
		headers: { "content-type": "application/json" },
	});
}

describe("POST /api/account/subscription", () => {
	beforeEach(async () => {
		await resetDb();
		vi.clearAllMocks();
	});

	it("creates a subscription after verifying the Paddle transaction", async () => {
		const user = await createUser();
		const mockAuth = vi.mocked(auth);
		mockAuth.mockResolvedValue({ userId: user.user_id });
		vi.mocked(currentUser).mockResolvedValue({
			fullName: "Test User",
			firstName: "Test",
			emailAddresses: [{ emailAddress: user.email, verification: { status: "verified" } }],
			imageUrl: null,
		} as any);

		const transactionId = "txn_123";
		const customerId = "ctm_123";
		const subscriptionId = "sub_456";
		const priceId = "pri_789";
		vi.mocked(getTransaction).mockResolvedValue({
			data: {
				id: transactionId,
				status: "completed",
				customer_id: customerId,
				subscription_id: subscriptionId,
				items: [{ price: { id: priceId } }],
			},
		});
		const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
		vi.mocked(getSubscriptionsByCustomer).mockResolvedValue({
			data: [
				{
					id: subscriptionId,
					status: "active",
					current_billing_period: {
						starts_at: new Date().toISOString(),
						ends_at: nextMonth,
					},
					items: [{ price: { id: priceId } }],
				},
			],
		});

		const res = await POST(buildRequest(transactionId));
		const payload = await res.json();

		expect(res.status).toBe(201);
		expect(payload.paddle_subscription_id).toBe(subscriptionId);

		const stored = await prisma.subscription.findFirst({
			where: { user_id: user.user_id },
		});
		expect(stored?.paddle_subscription_id).toBe(subscriptionId);
		expect(stored?.paddle_price_id).toBe(priceId);
	});

	it("rejects when the Paddle customer ID does not match the user record", async () => {
		const user = await createUser({ paddle_customer_id: "ctm_existing" });
		vi.mocked(auth).mockResolvedValue({ userId: user.user_id });
		vi.mocked(currentUser).mockResolvedValue(null);
		vi.mocked(getTransaction).mockResolvedValue({
			data: {
				id: "txn_mismatch",
				status: "completed",
				customer_id: "ctm_other",
				items: [{ price: { id: "pri_123" } }],
			},
		});

		const res = await POST(buildRequest("txn_mismatch"));
		const payload = await res.json();

		expect(res.status).toBe(403);
		expect(payload.error).toMatch(/customer mismatch/i);
		expect(getSubscriptionsByCustomer).not.toHaveBeenCalled();
	});

	it("rejects non-completed transactions", async () => {
		const user = await createUser();
		vi.mocked(auth).mockResolvedValue({ userId: user.user_id });
		vi.mocked(currentUser).mockResolvedValue(null);
		vi.mocked(getTransaction).mockResolvedValue({
			data: {
				id: "txn_pending",
				status: "pending",
				customer_id: "ctm_pending",
				items: [{ price: { id: "pri_pending" } }],
			},
		});

		const res = await POST(buildRequest("txn_pending"));
		const payload = await res.json();

		expect(res.status).toBe(409);
		expect(payload.error).toMatch(/not completed/i);
	});
});

