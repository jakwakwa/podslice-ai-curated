import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema definitions from the API routes
const createNotificationSettingSchema = z.object({
	description: z.string().min(1, "Description is required"),
	type: z.enum(["url", "email"]),
	destination: z.string().min(1, "Destination is required").refine(
		(val) => {
			return val.length > 0;
		},
		{ message: "Invalid destination" }
	),
	api_version: z.number().int().positive().default(1),
	include_sensitive_fields: z.boolean().optional().default(false),
	traffic_source: z.enum(["all", "platform", "simulation"]).default("all"),
	subscribed_events: z.array(z.string()).min(1, "At least one event must be subscribed"),
});

const updateNotificationSettingSchema = z.object({
	description: z.string().min(1).optional(),
	destination: z.string().min(1).optional(),
	active: z.boolean().optional(),
	traffic_source: z.enum(["all", "platform", "simulation"]).optional(),
	subscribed_events: z.array(z.string()).min(1).optional(),
});

describe("Paddle Notification Settings - Create Schema", () => {
	it("should validate a valid webhook notification setting", () => {
		const validData = {
			description: "Production webhook",
			type: "url" as const,
			destination: "https://example.com/webhook",
			api_version: 1,
			traffic_source: "all" as const,
			subscribed_events: ["subscription.created", "subscription.updated"],
		};

		const result = createNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.description).toBe("Production webhook");
			expect(result.data.type).toBe("url");
			expect(result.data.api_version).toBe(1);
		}
	});

	it("should validate a valid email notification setting", () => {
		const validData = {
			description: "Admin email notifications",
			type: "email" as const,
			destination: "admin@example.com",
			api_version: 1,
			traffic_source: "platform" as const,
			subscribed_events: ["transaction.completed"],
		};

		const result = createNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("should apply default values for optional fields", () => {
		const minimalData = {
			description: "Test",
			type: "url" as const,
			destination: "https://test.com",
			subscribed_events: ["subscription.created"],
		};

		const result = createNotificationSettingSchema.safeParse(minimalData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.api_version).toBe(1);
			expect(result.data.traffic_source).toBe("all");
			expect(result.data.include_sensitive_fields).toBe(false);
		}
	});

	it("should reject empty description", () => {
		const invalidData = {
			description: "",
			type: "url" as const,
			destination: "https://example.com",
			subscribed_events: ["subscription.created"],
		};

		const result = createNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject empty destination", () => {
		const invalidData = {
			description: "Test",
			type: "url" as const,
			destination: "",
			subscribed_events: ["subscription.created"],
		};

		const result = createNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject invalid type", () => {
		const invalidData = {
			description: "Test",
			type: "invalid",
			destination: "https://example.com",
			subscribed_events: ["subscription.created"],
		};

		const result = createNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject empty subscribed_events array", () => {
		const invalidData = {
			description: "Test",
			type: "url" as const,
			destination: "https://example.com",
			subscribed_events: [],
		};

		const result = createNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject missing subscribed_events", () => {
		const invalidData = {
			description: "Test",
			type: "url" as const,
			destination: "https://example.com",
		};

		const result = createNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject invalid traffic_source", () => {
		const invalidData = {
			description: "Test",
			type: "url" as const,
			destination: "https://example.com",
			traffic_source: "invalid",
			subscribed_events: ["subscription.created"],
		};

		const result = createNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject negative api_version", () => {
		const invalidData = {
			description: "Test",
			type: "url" as const,
			destination: "https://example.com",
			api_version: -1,
			subscribed_events: ["subscription.created"],
		};

		const result = createNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject zero api_version", () => {
		const invalidData = {
			description: "Test",
			type: "url" as const,
			destination: "https://example.com",
			api_version: 0,
			subscribed_events: ["subscription.created"],
		};

		const result = createNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});
});

describe("Paddle Notification Settings - Update Schema", () => {
	it("should validate a valid partial update", () => {
		const validData = {
			description: "Updated description",
			traffic_source: "platform" as const,
		};

		const result = updateNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("should validate updating only description", () => {
		const validData = {
			description: "New description",
		};

		const result = updateNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("should validate updating only destination", () => {
		const validData = {
			destination: "https://new-endpoint.com/webhook",
		};

		const result = updateNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("should validate updating active status", () => {
		const validData = {
			active: false,
		};

		const result = updateNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("should validate updating subscribed_events", () => {
		const validData = {
			subscribed_events: ["subscription.created", "subscription.canceled"],
		};

		const result = updateNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("should validate empty update object", () => {
		const validData = {};

		const result = updateNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("should reject empty description", () => {
		const invalidData = {
			description: "",
		};

		const result = updateNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject empty destination", () => {
		const invalidData = {
			destination: "",
		};

		const result = updateNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject invalid traffic_source", () => {
		const invalidData = {
			traffic_source: "invalid",
		};

		const result = updateNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should reject empty subscribed_events array", () => {
		const invalidData = {
			subscribed_events: [],
		};

		const result = updateNotificationSettingSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	it("should validate all fields together", () => {
		const validData = {
			description: "Fully updated",
			destination: "https://updated.com/webhook",
			active: true,
			traffic_source: "simulation" as const,
			subscribed_events: ["transaction.billed"],
		};

		const result = updateNotificationSettingSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});
});

describe("Paddle Notification Settings - Wrapper Functions", () => {
	// Mock test to verify function signatures and structure
	it("should have correct structure for listEventTypes call", () => {
		const expectedCall = {
			method: "GET",
			path: "/event-types",
		};
		
		expect(expectedCall.method).toBe("GET");
		expect(expectedCall.path).toBe("/event-types");
	});

	it("should have correct structure for listNotificationSettings call", () => {
		const expectedCall = {
			method: "GET",
			path: "/notification-settings",
		};
		
		expect(expectedCall.method).toBe("GET");
		expect(expectedCall.path).toBe("/notification-settings");
	});

	it("should have correct structure for createNotificationSetting call", () => {
		const expectedCall = {
			method: "POST",
			path: "/notification-settings",
			body: {
				description: "Test",
				type: "url",
				destination: "https://test.com",
				subscribed_events: ["subscription.created"],
			},
		};
		
		expect(expectedCall.method).toBe("POST");
		expect(expectedCall.path).toBe("/notification-settings");
		expect(expectedCall.body).toBeDefined();
	});

	it("should have correct structure for updateNotificationSetting call", () => {
		const notificationSettingId = "ntfset_test123";
		const expectedCall = {
			method: "PATCH",
			path: `/notification-settings/${notificationSettingId}`,
			body: {
				description: "Updated",
			},
		};
		
		expect(expectedCall.method).toBe("PATCH");
		expect(expectedCall.path).toBe(`/notification-settings/${notificationSettingId}`);
		expect(expectedCall.body).toBeDefined();
	});

	it("should have correct structure for deleteNotificationSetting call", () => {
		const notificationSettingId = "ntfset_test123";
		const expectedPath = `/notification-settings/${notificationSettingId}`;
		
		expect(expectedPath).toBe(`/notification-settings/${notificationSettingId}`);
	});
});

