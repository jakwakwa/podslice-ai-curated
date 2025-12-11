/**
 * Tests for Paddle webhook processing
 * Covers deterministic subscription resolution and ID validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ProcessWebhook } from "@/utils/paddle/process-webhook";
import { EventName } from "@paddle/paddle-node-sdk";

const prisma = new PrismaClient();

describe("ProcessWebhook - Subscription ID Validation", () => {
	let testUserId: string;
	let testCustomerId: string;

	beforeEach(async () => {
		// Create a test user
		const user = await prisma.user.create({
			data: {
				email: `test-${Date.now()}@example.com`,
				password: "test-password",
				paddle_customer_id: `ctm_test_${Date.now()}`,
			},
		});
		testUserId = user.user_id;
		testCustomerId = user.paddle_customer_id!;
	});

	afterEach(async () => {
		// Clean up test data
		await prisma.subscription.deleteMany({ where: { user_id: testUserId } });
		await prisma.user.delete({ where: { user_id: testUserId } });
	});

	it("should reject subscription IDs that do not start with sub_", async () => {
		const processor = new ProcessWebhook();
		const mockEvent = {
			eventId: "evt_test",
			eventType: EventName.SubscriptionCreated,
			occurredAt: new Date().toISOString(),
			notificationId: "ntf_test",
			data: {
				id: "invalid_id_123",
				customer_id: testCustomerId,
				status: "active",
				items: [{ price: { id: "pri_test" } }],
			},
		} as any;

		await processor.processEvent(mockEvent);

		// Subscription should not be created
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: testUserId },
		});
		expect(subscription).toBeNull();
	});

	it("should reject customer IDs stored in paddle_subscription_id field", async () => {
		const processor = new ProcessWebhook();
		const mockEvent = {
			eventId: "evt_test",
			eventType: EventName.SubscriptionCreated,
			occurredAt: new Date().toISOString(),
			notificationId: "ntf_test",
			data: {
				id: testCustomerId, // Customer ID instead of subscription ID
				customer_id: testCustomerId,
				status: "active",
				items: [{ price: { id: "pri_test" } }],
			},
		} as any;

		await processor.processEvent(mockEvent);

		// Subscription should not be created
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: testUserId },
		});
		expect(subscription).toBeNull();
	});

	it("should accept valid subscription IDs starting with sub_", async () => {
		const processor = new ProcessWebhook();
		const validSubId = `sub_test_${Date.now()}`;
		const mockEvent = {
			eventId: "evt_test",
			eventType: EventName.SubscriptionCreated,
			occurredAt: new Date().toISOString(),
			notificationId: "ntf_test",
			data: {
				id: validSubId,
				customer_id: testCustomerId,
				status: "active",
				items: [{ price: { id: "pri_test" } }],
				current_billing_period: {
					starts_at: new Date().toISOString(),
					ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				},
			},
		} as any;

		await processor.processEvent(mockEvent);

		// Subscription should be created
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: testUserId },
		});
		expect(subscription).not.toBeNull();
		expect(subscription?.paddle_subscription_id).toBe(validSubId);
	});
});

describe("ProcessWebhook - Deterministic Subscription Resolution", () => {
	let testUserId: string;
	let testCustomerId: string;

	beforeEach(async () => {
		const user = await prisma.user.create({
			data: {
				email: `test-${Date.now()}@example.com`,
				password: "test-password",
				paddle_customer_id: `ctm_test_${Date.now()}`,
			},
		});
		testUserId = user.user_id;
		testCustomerId = user.paddle_customer_id!;
	});

	afterEach(async () => {
		await prisma.subscription.deleteMany({ where: { user_id: testUserId } });
		await prisma.user.delete({ where: { user_id: testUserId } });
	});

	it("should claim unclaimed subscription with NULL paddle_subscription_id", async () => {
		// Create a subscription with NULL paddle_subscription_id
		const unclaimedSub = await prisma.subscription.create({
			data: {
				user_id: testUserId,
				paddle_subscription_id: null,
				status: "trialing",
				plan_type: "casual_listener",
			},
		});

		const processor = new ProcessWebhook();
		const validSubId = `sub_test_${Date.now()}`;
		const mockEvent = {
			eventId: "evt_test",
			eventType: EventName.SubscriptionUpdated,
			occurredAt: new Date().toISOString(),
			notificationId: "ntf_test",
			data: {
				id: validSubId,
				customer_id: testCustomerId,
				status: "active",
				items: [{ price: { id: "pri_test" } }],
				current_billing_period: {
					starts_at: new Date().toISOString(),
					ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				},
			},
		} as any;

		await processor.processEvent(mockEvent);

		// The unclaimed subscription should now have the valid paddle_subscription_id
		const updatedSub = await prisma.subscription.findUnique({
			where: { paddle_subscription_id: validSubId },
		});
		expect(updatedSub).not.toBeNull();
		expect(updatedSub?.subscription_id).toBe(unclaimedSub.subscription_id);
		expect(updatedSub?.status).toBe("active");
	});

	it("should use existing subscription if paddle_subscription_id matches", async () => {
		const validSubId = `sub_test_${Date.now()}`;
		
		// Create a subscription with a valid paddle_subscription_id
		const existingSub = await prisma.subscription.create({
			data: {
				user_id: testUserId,
				paddle_subscription_id: validSubId,
				status: "active",
				plan_type: "casual_listener",
			},
		});

		const processor = new ProcessWebhook();
		const mockEvent = {
			eventId: "evt_test",
			eventType: EventName.SubscriptionUpdated,
			occurredAt: new Date().toISOString(),
			notificationId: "ntf_test",
			data: {
				id: validSubId,
				customer_id: testCustomerId,
				status: "past_due",
				items: [{ price: { id: "pri_test" } }],
			},
		} as any;

		await processor.processEvent(mockEvent);

		// Should update the existing subscription, not create a new one
		const allSubs = await prisma.subscription.findMany({
			where: { user_id: testUserId },
		});
		expect(allSubs.length).toBe(1);
		expect(allSubs[0].subscription_id).toBe(existingSub.subscription_id);
		expect(allSubs[0].status).toBe("past_due");
	});
});

describe("ProcessWebhook - Customer ID Validation", () => {
	let testUserId: string;

	beforeEach(async () => {
		const user = await prisma.user.create({
			data: {
				email: `test-${Date.now()}@example.com`,
				password: "test-password",
				paddle_customer_id: `ctm_test_${Date.now()}`,
			},
		});
		testUserId = user.user_id;
	});

	afterEach(async () => {
		await prisma.subscription.deleteMany({ where: { user_id: testUserId } });
		await prisma.user.delete({ where: { user_id: testUserId } });
	});

	it("should reject events with invalid customer ID format", async () => {
		const processor = new ProcessWebhook();
		const mockEvent = {
			eventId: "evt_test",
			eventType: EventName.SubscriptionCreated,
			occurredAt: new Date().toISOString(),
			notificationId: "ntf_test",
			data: {
				id: `sub_test_${Date.now()}`,
				customer_id: "invalid_customer_id",
				status: "active",
				items: [{ price: { id: "pri_test" } }],
			},
		} as any;

		await processor.processEvent(mockEvent);

		// Subscription should not be created
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: testUserId },
		});
		expect(subscription).toBeNull();
	});

	it("should reject events with missing customer ID", async () => {
		const processor = new ProcessWebhook();
		const mockEvent = {
			eventId: "evt_test",
			eventType: EventName.SubscriptionCreated,
			occurredAt: new Date().toISOString(),
			notificationId: "ntf_test",
			data: {
				id: `sub_test_${Date.now()}`,
				status: "active",
				items: [{ price: { id: "pri_test" } }],
			},
		} as any;

		await processor.processEvent(mockEvent);

		// Subscription should not be created
		const subscription = await prisma.subscription.findFirst({
			where: { user_id: testUserId },
		});
		expect(subscription).toBeNull();
	});
});

describe("ProcessWebhook - Logging", () => {
	it("should log webhook snapshots in non-production environment", () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";

		const consoleSpy = vi.spyOn(console, "log");
		const processor = new ProcessWebhook();
		
		// Access private method for testing
		(processor as any).logWebhookSnapshot("test_event", { foo: "bar" });

		expect(consoleSpy).toHaveBeenCalledWith(
			"[WEBHOOK_SNAPSHOT:test_event]",
			expect.stringContaining("bar")
		);

		process.env.NODE_ENV = originalEnv;
		consoleSpy.mockRestore();
	});

	it("should not log webhook snapshots in production environment", () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		const consoleSpy = vi.spyOn(console, "log");
		const processor = new ProcessWebhook();
		
		// Access private method for testing
		(processor as any).logWebhookSnapshot("test_event", { foo: "bar" });

		expect(consoleSpy).not.toHaveBeenCalled();

		process.env.NODE_ENV = originalEnv;
		consoleSpy.mockRestore();
	});
});

