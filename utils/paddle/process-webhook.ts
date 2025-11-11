import {
	type CustomerCreatedEvent,
	type CustomerUpdatedEvent,
	type EventEntity,
	EventName,
	type SubscriptionCreatedEvent,
	type SubscriptionUpdatedEvent,
	type TransactionCompletedEvent,
	type TransactionPaymentFailedEvent,
} from "@paddle/paddle-node-sdk";
import { z } from "zod";
import { ensureBucketName, getStorageUploader } from "@/lib/inngest/utils/gcs";
import { prisma } from "@/lib/prisma";
import { priceIdToPlanType } from "@/utils/paddle/plan-utils";

export class ProcessWebhook {
	async processEvent(eventData: EventEntity) {
		switch (eventData.eventType) {
			case EventName.SubscriptionCreated:
			case EventName.SubscriptionUpdated:
				await this.updateSubscriptionData(eventData);
				break;
			case EventName.CustomerCreated:
			case EventName.CustomerUpdated:
				await this.updateCustomerData(eventData);
				break;
			case EventName.TransactionCompleted:
				await this.handlePaymentSuccess(eventData);
				break;
			case EventName.TransactionPaymentFailed:
				await this.handlePaymentFailed(eventData);
				break;
			default:
				// Log unhandled events but don't fail
				console.log(`[WEBHOOK_PROCESSOR] Unhandled event type: ${eventData.eventType}`);
				break;
		}
	}

	private async updateSubscriptionData(
		event: SubscriptionCreatedEvent | SubscriptionUpdatedEvent
	) {
		const ItemSchema = z.object({
			price: z.object({ id: z.string().optional() }).optional(),
			price_id: z.string().optional(),
		});
		const PeriodSchema = z.object({
			starts_at: z.string().optional(),
			ends_at: z.string().optional(),
		});
		const ScheduledChangeSchema = z
			.object({
				action: z.string().optional(),
				effective_at: z.string().optional(),
			})
			.optional();
		const SubscriptionDataSchema = z.object({
			id: z.string().optional(),
			subscription_id: z.string().optional(),
			customer_id: z.string().optional(),
			// Some payloads may provide nested customer or a string ID
			customer: z.union([z.object({ id: z.string().optional() }), z.string()]).optional(),
			status: z.string().optional(),
			items: z.array(ItemSchema).optional(),
			current_billing_period: PeriodSchema.optional(),
			started_at: z.string().optional(),
			next_billed_at: z.string().optional(),
			trial_end_at: z.string().optional(),
			canceled_at: z.string().optional(),
			cancel_at_end: z.boolean().optional(),
			cancel_at_period_end: z.boolean().optional(),
			scheduled_change: ScheduledChangeSchema,
		});

		// Support both flat data and JSON:API-style data with attributes/relationships
		const eventDataUnknown = event as unknown as { data?: unknown };
		const source = (eventDataUnknown?.data ?? {}) as Record<string, unknown>;
		const candidate = ((source.attributes as unknown) ?? source) as Record<
			string,
			unknown
		>;
		const parsed = SubscriptionDataSchema.safeParse(candidate);
		if (!parsed.success) {
			console.error(
				"[SUBSCRIPTION_UPDATE] Failed to parse subscription data:",
				parsed.error
			);
			return;
		}

		const d = parsed.data;
		const externalId = d.id ?? d.subscription_id;
		if (!externalId) {
			console.warn("[SUBSCRIPTION_UPDATE] No subscription ID found in event data");
			return;
		}

		console.log(`[SUBSCRIPTION_UPDATE] Processing subscription ${externalId}`);

		// Extract price id with multiple fallbacks
		const priceId =
			d.items?.[0]?.price?.id ??
			d.items?.[0]?.price_id ??
			// JSON:API style nested relationship
			(() => {
				const attrs = source.attributes as unknown as Record<string, unknown> | undefined;
				const items = attrs?.items as unknown as unknown[] | undefined;
				const first = Array.isArray(items)
					? (items[0] as Record<string, unknown>)
					: undefined;
				const price = first?.price as unknown as Record<string, unknown> | undefined;
				const dataNode = price?.data as unknown as Record<string, unknown> | undefined;
				const id = dataNode?.id;
				return typeof id === "string" ? id : undefined;
			})() ??
			null;
		const status = typeof d.status === "string" ? d.status : "active";
		const current_period_start = d.current_billing_period?.starts_at
			? new Date(d.current_billing_period.starts_at)
			: d.started_at
				? new Date(d.started_at)
				: null;
		const current_period_end = d.current_billing_period?.ends_at
			? new Date(d.current_billing_period.ends_at)
			: d.next_billed_at
				? new Date(d.next_billed_at)
				: null;
		const trial_end = d.trial_end_at ? new Date(d.trial_end_at) : null;
		const canceled_at = d.canceled_at ? new Date(d.canceled_at) : null;
		// Check for scheduled cancellation in the scheduled_change object
		const hasScheduledCancellation = d.scheduled_change?.action === "cancel";
		const cancel_at_period_end = Boolean(
			d.cancel_at_end || d.cancel_at_period_end || hasScheduledCancellation
		);

		if (hasScheduledCancellation) {
			console.log(
				`[SUBSCRIPTION_UPDATE] Detected scheduled cancellation - effective at: ${d.scheduled_change?.effective_at}`
			);
		}

		// Extract customer id from multiple shapes, including JSON:API relationships
		const relationshipsCustomerId: string | undefined = (() => {
			const rels = source.relationships as unknown as Record<string, unknown> | undefined;
			const customerRel = rels?.customer as unknown as
				| Record<string, unknown>
				| undefined;
			const dataNode = customerRel?.data as unknown as
				| Record<string, unknown>
				| undefined;
			const id = dataNode?.id;
			return typeof id === "string" ? id : undefined;
		})();
		const candidateCustomerIdSnake =
			typeof candidate["customer_id"] === "string"
				? (candidate["customer_id"] as string)
				: undefined;
		const candidateCustomerIdCamel =
			typeof candidate["customerId"] === "string"
				? (candidate["customerId"] as string)
				: undefined;
		const candidateCustomerObj = candidate["customer"] as unknown as
			| string
			| Record<string, unknown>
			| undefined;
		const candidateCustomerInnerId =
			typeof candidateCustomerObj === "string"
				? candidateCustomerObj
				: typeof candidateCustomerObj === "object" && candidateCustomerObj
					? (candidateCustomerObj["id"] as string | undefined)
					: undefined;
		const customerId =
			(typeof d.customer_id === "string" ? d.customer_id : undefined) ??
			(typeof d.customer === "string"
				? d.customer
				: (d.customer?.id as string | undefined)) ??
			candidateCustomerIdSnake ??
			candidateCustomerIdCamel ??
			candidateCustomerInnerId ??
			relationshipsCustomerId;
		if (!customerId) {
			console.warn("[SUBSCRIPTION_UPDATE] No customer ID found in event data");
			return;
		}

		const user = await prisma.user.findFirst({
			where: { paddle_customer_id: customerId },
			select: { user_id: true },
		});
		if (!user) {
			console.warn(`[SUBSCRIPTION_UPDATE] No user found for customer ID: ${customerId}`);
			return;
		}

		console.log(
			`[SUBSCRIPTION_UPDATE] Found user ${user.user_id} for customer ${customerId}`
		);

		// Get existing subscription to detect status changes
		const existingSubscription = await prisma.subscription.findUnique({
			where: { paddle_subscription_id: externalId },
			select: { status: true, plan_type: true },
		});

		const isNewSubscription = !existingSubscription;
		const statusChanged = Boolean(
			existingSubscription && existingSubscription.status !== status
		);
		const newPlanType = priceIdToPlanType(priceId);
		const planChanged = Boolean(
			existingSubscription &&
				newPlanType &&
				existingSubscription.plan_type !== newPlanType
		);

		// Log detected changes
		if (isNewSubscription) {
			console.log(
				`[SUBSCRIPTION_UPDATE] New subscription detected - Status: ${status}, Plan: ${newPlanType}`
			);
		} else {
			if (statusChanged) {
				console.log(
					`[SUBSCRIPTION_UPDATE] Status changed: ${existingSubscription?.status} → ${status}`
				);
			}
			if (planChanged) {
				console.log(
					`[SUBSCRIPTION_UPDATE] Plan changed: ${existingSubscription?.plan_type} → ${newPlanType}`
				);
			}
			if (!(statusChanged || planChanged)) {
				console.log("[SUBSCRIPTION_UPDATE] No significant changes detected");
			}
		}

		if (status === "canceled") {
			console.log(`[SUBSCRIPTION_UPDATE] Handling cancellation for user ${user.user_id}`);
			await this.handleSubscriptionCancellation(user.user_id);
		}

		const updateData = {
			paddle_price_id: priceId,
			plan_type: newPlanType ?? undefined,
			status,
			current_period_start,
			current_period_end,
			trial_end,
			canceled_at,
			cancel_at_period_end,
		};

		// Usage is now tracked by counting UserEpisode records, no need to reset counters

		await prisma.subscription.upsert({
			where: { paddle_subscription_id: externalId },
			create: {
				user_id: user.user_id,
				paddle_subscription_id: externalId,
				...updateData,
			},
			update: updateData,
		});

		console.log(
			`[SUBSCRIPTION_UPDATE] Subscription upserted successfully for user ${user.user_id}`
		);

		// Create notifications for important subscription events
		console.log("[SUBSCRIPTION_UPDATE] Creating subscription notifications");
		await this.createSubscriptionNotifications({
			userId: user.user_id,
			isNewSubscription,
			status,
			statusChanged,
			planChanged,
			oldStatus: existingSubscription?.status,
			newPlanType: newPlanType ?? undefined,
			oldPlanType: existingSubscription?.plan_type,
			cancelAtPeriodEnd: cancel_at_period_end,
			currentPeriodEnd: current_period_end ?? undefined,
		});
	}

	private async createSubscriptionNotifications(params: {
		userId: string;
		isNewSubscription: boolean;
		status: string;
		statusChanged: boolean;
		planChanged: boolean;
		oldStatus?: string;
		newPlanType?: string;
		oldPlanType?: string;
		cancelAtPeriodEnd: boolean;
		currentPeriodEnd?: Date;
	}) {
		const {
			userId,
			isNewSubscription,
			status,
			statusChanged,
			planChanged,
			oldStatus,
			newPlanType,
			oldPlanType,
			cancelAtPeriodEnd,
			currentPeriodEnd,
		} = params;

		// Check if user has enabled in-app notifications
		try {
			const user = await prisma.user.findUnique({
				where: { user_id: userId },
				select: { in_app_notifications: true },
			});

			if (!user?.in_app_notifications) {
				console.log(
					`[NOTIFICATION_CREATE] User ${userId} has disabled in-app notifications, skipping`
				);
				return;
			}
		} catch (error) {
			console.error(
				`[NOTIFICATION_CREATE] Error checking user preferences for ${userId}:`,
				error
			);
			// Continue anyway - better to send notification than miss it
		}

		// New subscription activated
		if (isNewSubscription && status === "active") {
			try {
				console.log(
					`[NOTIFICATION_CREATE] Creating subscription_activated notification for user ${userId}`
				);
				const notification = await prisma.notification.create({
					data: {
						user_id: userId,
						type: "subscription_activated",
						message: `Your ${this.formatPlanName(newPlanType)} subscription is now active!`,
					},
				});
				console.log(
					`[NOTIFICATION_CREATE] Created notification ${notification.notification_id} for user ${userId}`
				);
			} catch (error) {
				console.error(
					`[NOTIFICATION_CREATE] Failed to create subscription_activated notification for user ${userId}:`,
					error
				);
			}
			return;
		}

		// Subscription renewed
		if (statusChanged && oldStatus === "past_due" && status === "active") {
			try {
				console.log(
					`[NOTIFICATION_CREATE] Creating subscription_renewed notification for user ${userId}`
				);
				const notification = await prisma.notification.create({
					data: {
						user_id: userId,
						type: "subscription_renewed",
						message: "Your subscription has been successfully renewed.",
					},
				});
				console.log(
					`[NOTIFICATION_CREATE] Created notification ${notification.notification_id} for user ${userId}`
				);
			} catch (error) {
				console.error(
					`[NOTIFICATION_CREATE] Failed to create subscription_renewed notification for user ${userId}:`,
					error
				);
			}
			return;
		}

		// Subscription cancelled
		if (statusChanged && status === "canceled") {
			try {
				console.log(
					`[NOTIFICATION_CREATE] Creating subscription_cancelled notification for user ${userId}`
				);
				const notification = await prisma.notification.create({
					data: {
						user_id: userId,
						type: "subscription_cancelled",
						message:
							"Your subscription has been cancelled. You'll retain access until the end of your billing period.",
					},
				});
				console.log(
					`[NOTIFICATION_CREATE] Created notification ${notification.notification_id} for user ${userId}`
				);
			} catch (error) {
				console.error(
					`[NOTIFICATION_CREATE] Failed to create subscription_cancelled notification for user ${userId}:`,
					error
				);
			}
			return;
		}

		// Payment failed
		if (statusChanged && status === "past_due") {
			try {
				console.log(
					`[NOTIFICATION_CREATE] Creating payment_failed notification for user ${userId}`
				);
				const notification = await prisma.notification.create({
					data: {
						user_id: userId,
						type: "payment_failed",
						message:
							"We couldn't process your payment. Please update your payment method to continue your subscription.",
					},
				});
				console.log(
					`[NOTIFICATION_CREATE] Created notification ${notification.notification_id} for user ${userId}`
				);
			} catch (error) {
				console.error(
					`[NOTIFICATION_CREATE] Failed to create payment_failed notification for user ${userId}:`,
					error
				);
			}
			return;
		}

		// Plan upgraded/downgraded
		if (planChanged && newPlanType && oldPlanType) {
			const isUpgrade = this.isUpgrade(oldPlanType, newPlanType);
			try {
				console.log(
					`[NOTIFICATION_CREATE] Creating subscription_${isUpgrade ? "upgraded" : "downgraded"} notification for user ${userId}`
				);
				const notification = await prisma.notification.create({
					data: {
						user_id: userId,
						type: isUpgrade ? "subscription_upgraded" : "subscription_downgraded",
						message: `Your plan has been ${isUpgrade ? "upgraded" : "changed"} to ${this.formatPlanName(newPlanType)}.`,
					},
				});
				console.log(
					`[NOTIFICATION_CREATE] Created notification ${notification.notification_id} for user ${userId}`
				);
			} catch (error) {
				console.error(
					`[NOTIFICATION_CREATE] Failed to create subscription_${isUpgrade ? "upgraded" : "downgraded"} notification for user ${userId}:`,
					error
				);
			}
			return;
		}

		// Scheduled cancellation
		if (cancelAtPeriodEnd && currentPeriodEnd) {
			const endDate = currentPeriodEnd.toLocaleDateString();
			try {
				console.log(
					`[NOTIFICATION_CREATE] Creating subscription_ending notification for user ${userId}`
				);
				const notification = await prisma.notification.create({
					data: {
						user_id: userId,
						type: "subscription_ending",
						message: `Your subscription will end on ${endDate}. You can reactivate it anytime before then.`,
					},
				});
				console.log(
					`[NOTIFICATION_CREATE] Created notification ${notification.notification_id} for user ${userId}`
				);
			} catch (error) {
				console.error(
					`[NOTIFICATION_CREATE] Failed to create subscription_ending notification for user ${userId}:`,
					error
				);
			}
		}
	}

	private formatPlanName(planType?: string): string {
		if (!planType) return "subscription";

		const planNames: Record<string, string> = {
			casual_listener: "Casual Listener",
			regular_listener: "Regular Listener",
			power_listener: "Power Listener",
		};

		return planNames[planType] || planType;
	}

	private isUpgrade(oldPlan: string, newPlan: string): boolean {
		const planHierarchy = ["casual_listener", "regular_listener", "power_listener"];
		const oldIndex = planHierarchy.indexOf(oldPlan);
		const newIndex = planHierarchy.indexOf(newPlan);
		return newIndex > oldIndex;
	}

	private async handleSubscriptionCancellation(userId: string) {
		const episodes = await prisma.userEpisode.findMany({
			where: { user_id: userId },
		});

		if (episodes.length > 0) {
			try {
				const storage = getStorageUploader();
				const bucketName = ensureBucketName();

				const deletePromises = episodes.map(episode => {
					if (episode.gcs_audio_url) {
						const objectName = episode.gcs_audio_url.replace(`gs://${bucketName}/`, "");
						return storage.bucket(bucketName).file(objectName).delete();
					}
					return Promise.resolve();
				});

				await Promise.all(deletePromises);
				await prisma.userEpisode.deleteMany({ where: { user_id: userId } });
			} catch (error) {
				console.error(
					`Failed to delete GCS files or user episodes for user ${userId}:`,
					error
				);
				// Don't throw here, as we still want to update the subscription status
			}
		}
	}

	private async updateCustomerData(event: CustomerCreatedEvent | CustomerUpdatedEvent) {
		const CustomerDataSchema = z.object({
			id: z.string(),
			email: z.string().email().optional(),
		});
		const parsed = CustomerDataSchema.safeParse(
			(event as unknown as { data?: unknown }).data
		);
		if (!parsed.success) return;
		const { id, email } = parsed.data;
		if (!email) return;
		await prisma.user.updateMany({
			where: { email, paddle_customer_id: null },
			data: { paddle_customer_id: id },
		});
	}

	private async handlePaymentSuccess(event: TransactionCompletedEvent) {
		const TransactionDataSchema = z.object({
			customer_id: z.string().optional(),
			// Fallback nested customer or string id
			customer: z.union([z.object({ id: z.string().optional() }), z.string()]).optional(),
			subscription_id: z.string().optional(),
			billing_period: z
				.object({
					starts_at: z.string().optional(),
					ends_at: z.string().optional(),
				})
				.optional(),
		});

		// Support both flat and JSON:API-style transaction payloads
		const eventUnknownSuccess = event as unknown as { data?: unknown };
		const src = (eventUnknownSuccess?.data ?? {}) as Record<string, unknown>;
		const cand = ((src.attributes as unknown) ?? src) as Record<string, unknown>;
		const parsed = TransactionDataSchema.safeParse(cand);
		if (!parsed.success) {
			console.error("[PAYMENT_SUCCESS] Failed to parse transaction data:", parsed.error);
			return;
		}

		const relationshipsCustomerIdSuccess: string | undefined = (() => {
			const rels = src.relationships as unknown as Record<string, unknown> | undefined;
			const customerRel = rels?.customer as unknown as
				| Record<string, unknown>
				| undefined;
			const dataNode = customerRel?.data as unknown as
				| Record<string, unknown>
				| undefined;
			const id = dataNode?.id;
			return typeof id === "string" ? id : undefined;
		})();
		const customerId =
			parsed.data.customer_id ??
			(typeof parsed.data.customer === "string"
				? parsed.data.customer
				: parsed.data.customer?.id) ??
			relationshipsCustomerIdSuccess;
		if (!customerId) {
			console.warn("[PAYMENT_SUCCESS] No customer ID in transaction data");
			return;
		}

		console.log(`[PAYMENT_SUCCESS] Processing payment for customer ${customerId}`);

		const user = await prisma.user.findFirst({
			where: { paddle_customer_id: customerId },
			select: { user_id: true, in_app_notifications: true },
		});
		if (!user) {
			console.warn(`[PAYMENT_SUCCESS] No user found for customer ${customerId}`);
			return;
		}

		// Check if user has enabled notifications
		if (!user.in_app_notifications) {
			console.log(
				`[PAYMENT_SUCCESS] User ${user.user_id} has disabled in-app notifications, skipping`
			);
			return;
		}

		// Only notify for recurring payments (not initial subscription)
		if (parsed.data.subscription_id) {
			const subscription = await prisma.subscription.findFirst({
				where: {
					paddle_subscription_id: parsed.data.subscription_id,
					user_id: user.user_id,
				},
				select: { created_at: true },
			});

			// If subscription is older than 1 day, this is a renewal payment
			if (subscription && Date.now() - subscription.created_at.getTime() > 86400000) {
				try {
					console.log(
						`[PAYMENT_SUCCESS] Creating payment_successful notification for user ${user.user_id}`
					);
					const notification = await prisma.notification.create({
						data: {
							user_id: user.user_id,
							type: "payment_successful",
							message: "Your payment was processed successfully. Thank you!",
						},
					});
					console.log(
						`[PAYMENT_SUCCESS] Created notification ${notification.notification_id} for user ${user.user_id}`
					);
				} catch (error) {
					console.error(
						`[PAYMENT_SUCCESS] Failed to create notification for user ${user.user_id}:`,
						error
					);
				}
			} else {
				console.log(
					`[PAYMENT_SUCCESS] Skipping notification - initial subscription payment or no subscription found`
				);
			}
		}
	}

	private async handlePaymentFailed(event: TransactionPaymentFailedEvent) {
		const TransactionDataSchema = z.object({
			customer_id: z.string().optional(),
			customer: z.union([z.object({ id: z.string().optional() }), z.string()]).optional(),
		});

		const eventUnknownFailed = event as unknown as { data?: unknown };
		const srcFailed = (eventUnknownFailed?.data ?? {}) as Record<string, unknown>;
		const candFailed = ((srcFailed.attributes as unknown) ?? srcFailed) as Record<
			string,
			unknown
		>;
		const parsed = TransactionDataSchema.safeParse(candFailed);
		if (!parsed.success) {
			console.error("[PAYMENT_FAILED] Failed to parse transaction data:", parsed.error);
			return;
		}

		const relationshipsCustomerIdFailed: string | undefined = (() => {
			const rels = srcFailed.relationships as unknown as
				| Record<string, unknown>
				| undefined;
			const customerRel = rels?.customer as unknown as
				| Record<string, unknown>
				| undefined;
			const dataNode = customerRel?.data as unknown as
				| Record<string, unknown>
				| undefined;
			const id = dataNode?.id;
			return typeof id === "string" ? id : undefined;
		})();
		const customerId =
			parsed.data.customer_id ??
			(typeof parsed.data.customer === "string"
				? parsed.data.customer
				: parsed.data.customer?.id) ??
			relationshipsCustomerIdFailed;
		if (!customerId) {
			console.warn("[PAYMENT_FAILED] No customer ID in transaction data");
			return;
		}

		console.log(`[PAYMENT_FAILED] Processing failed payment for customer ${customerId}`);

		const user = await prisma.user.findFirst({
			where: { paddle_customer_id: customerId },
			select: { user_id: true, in_app_notifications: true },
		});
		if (!user) {
			console.warn(`[PAYMENT_FAILED] No user found for customer ${customerId}`);
			return;
		}

		// Check if user has enabled notifications
		if (!user.in_app_notifications) {
			console.log(
				`[PAYMENT_FAILED] User ${user.user_id} has disabled in-app notifications, skipping`
			);
			return;
		}

		try {
			console.log(
				`[PAYMENT_FAILED] Creating payment_failed notification for user ${user.user_id}`
			);
			const notification = await prisma.notification.create({
				data: {
					user_id: user.user_id,
					type: "payment_failed",
					message:
						"We couldn't process your payment. Please update your payment method to avoid service interruption.",
				},
			});
			console.log(
				`[PAYMENT_FAILED] Created notification ${notification.notification_id} for user ${user.user_id}`
			);
		} catch (error) {
			console.error(
				`[PAYMENT_FAILED] Failed to create notification for user ${user.user_id}:`,
				error
			);
		}
	}
}
