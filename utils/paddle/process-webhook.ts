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
	/**
	 * Logs webhook processing snapshots for debugging
	 * Only active in non-production environments to avoid log pollution
	 */
	private logWebhookSnapshot(eventName: string, data: Record<string, unknown>) {
		if (process.env.NODE_ENV !== "production") {
			console.log(`[WEBHOOK_SNAPSHOT:${eventName}]`, JSON.stringify(data, null, 2));
		}
	}

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
		const SubscriptionDataSchema = z.object({
			id: z.string().optional(),
			subscription_id: z.string().optional(),
			customer_id: z.string().optional(),
			status: z.string().optional(),
			items: z.array(ItemSchema).optional(),
			current_billing_period: PeriodSchema.optional(),
			started_at: z.string().optional(),
			next_billed_at: z.string().optional(),
			trial_end_at: z.string().optional(),
			canceled_at: z.string().optional(),
			cancel_at_end: z.boolean().optional(),
			cancel_at_period_end: z.boolean().optional(),
		});

		const parsed = SubscriptionDataSchema.safeParse(
			(event as unknown as { data?: unknown }).data
		);
		if (!parsed.success) {
			this.logWebhookSnapshot("subscription_parse_failed", {
				eventType: event.eventType,
				parseError: parsed.error,
			});
			return;
		}

		const d = parsed.data;
		const externalId = d.id ?? d.subscription_id;

		// Validate subscription ID format
		const hasValidSubscriptionId = Boolean(externalId?.startsWith("sub_"));

		if (!hasValidSubscriptionId) {
			this.logWebhookSnapshot("invalid_subscription_id_format", {
				eventType: event.eventType,
				receivedId: externalId,
				customerId: d.customer_id,
			});
			return;
		}

		const priceId = d.items?.[0]?.price?.id ?? d.items?.[0]?.price_id ?? null;
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
		const cancel_at_period_end = Boolean(d.cancel_at_end || d.cancel_at_period_end);

		const customerId = d.customer_id;
		const isValidCustomerId = Boolean(customerId?.startsWith("ctm_"));

		if (!isValidCustomerId) {
			this.logWebhookSnapshot("invalid_customer_id_format", {
				eventType: event.eventType,
				receivedCustomerId: customerId,
				subscriptionId: externalId,
			});
			return;
		}

		// Deterministic user resolution: lookup by customer ID
		const user = await prisma.user.findFirst({
			where: { paddle_customer_id: customerId },
			select: { user_id: true, paddle_customer_id: true },
		});

		if (!user) {
			this.logWebhookSnapshot("user_not_found_for_customer", {
				eventType: event.eventType,
				customerId,
				subscriptionId: externalId,
			});
			return;
		}

		// Deterministic subscription resolution: attempt findUnique by paddle_subscription_id
		let existingSubscription = await prisma.subscription.findUnique({
			where: { paddle_subscription_id: externalId },
			select: { subscription_id: true, user_id: true, status: true, plan_type: true },
		});

		// If not found, check if user has a subscription with NULL or mismatched paddle_subscription_id
		if (!existingSubscription) {
			const userSubscriptions = await prisma.subscription.findMany({
				where: { user_id: user.user_id },
				select: {
					subscription_id: true,
					paddle_subscription_id: true,
					status: true,
					plan_type: true,
				},
			});

			// Look for a subscription with NULL or invalid paddle_subscription_id that we can claim
			const unclaimedSub = userSubscriptions.find(s => {
				const hasNoPaddleId = !s.paddle_subscription_id;
				const hasInvalidFormat =
					s.paddle_subscription_id && !s.paddle_subscription_id.startsWith("sub_");
				return hasNoPaddleId || hasInvalidFormat;
			});

			if (unclaimedSub) {
				this.logWebhookSnapshot("claiming_unclaimed_subscription", {
					eventType: event.eventType,
					subscriptionId: externalId,
					localSubscriptionId: unclaimedSub.subscription_id,
					oldPaddleSubscriptionId: unclaimedSub.paddle_subscription_id,
					userId: user.user_id,
				});

				existingSubscription = {
					subscription_id: unclaimedSub.subscription_id,
					user_id: user.user_id,
					status: unclaimedSub.status,
					plan_type: unclaimedSub.plan_type,
				};
			}
		}

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

		this.logWebhookSnapshot("subscription_update_resolved", {
			eventType: event.eventType,
			subscriptionId: externalId,
			customerId,
			userId: user.user_id,
			isNewSubscription,
			statusChanged,
			planChanged,
			oldStatus: existingSubscription?.status,
			newStatus: status,
		});

		if (status === "canceled") {
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

		// Create notifications for important subscription events
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

		// New subscription activated
		if (isNewSubscription && status === "active") {
			await prisma.notification.create({
				data: {
					user_id: userId,
					type: "subscription_activated",
					message: `Your ${this.formatPlanName(newPlanType)} subscription is now active!`,
				},
			});
			return;
		}

		// Subscription renewed
		if (statusChanged && oldStatus === "past_due" && status === "active") {
			await prisma.notification.create({
				data: {
					user_id: userId,
					type: "subscription_renewed",
					message: "Your subscription has been successfully renewed.",
				},
			});
			return;
		}

		// Subscription cancelled
		if (statusChanged && status === "canceled") {
			await prisma.notification.create({
				data: {
					user_id: userId,
					type: "subscription_cancelled",
					message:
						"Your subscription has been cancelled. You'll retain access until the end of your billing period.",
				},
			});
			return;
		}

		// Payment failed
		if (statusChanged && status === "past_due") {
			await prisma.notification.create({
				data: {
					user_id: userId,
					type: "payment_failed",
					message:
						"We couldn't process your payment. Please update your payment method to continue your subscription.",
				},
			});
			return;
		}

		// Plan upgraded/downgraded
		if (planChanged && newPlanType && oldPlanType) {
			const isUpgrade = this.isUpgrade(oldPlanType, newPlanType);
			await prisma.notification.create({
				data: {
					user_id: userId,
					type: isUpgrade ? "subscription_upgraded" : "subscription_downgraded",
					message: `Your plan has been ${isUpgrade ? "upgraded" : "changed"} to ${this.formatPlanName(newPlanType)}.`,
				},
			});
			return;
		}

		// Scheduled cancellation
		if (cancelAtPeriodEnd && currentPeriodEnd) {
			const endDate = currentPeriodEnd.toLocaleDateString();
			await prisma.notification.create({
				data: {
					user_id: userId,
					type: "subscription_ending",
					message: `Your subscription will end on ${endDate}. You can reactivate it anytime before then.`,
				},
			});
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
			subscription_id: z.string().optional(),
			billing_period: z
				.object({
					starts_at: z.string().optional(),
					ends_at: z.string().optional(),
				})
				.optional(),
		});

		const parsed = TransactionDataSchema.safeParse(
			(event as unknown as { data?: unknown }).data
		);
		if (!parsed.success) return;

		const customerId = parsed.data.customer_id;
		if (!customerId) return;

		const user = await prisma.user.findFirst({
			where: { paddle_customer_id: customerId },
			select: { user_id: true },
		});
		if (!user) return;

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
				await prisma.notification.create({
					data: {
						user_id: user.user_id,
						type: "payment_successful",
						message: "Your payment was processed successfully. Thank you!",
					},
				});
			}
		}
	}

	private async handlePaymentFailed(event: TransactionPaymentFailedEvent) {
		const TransactionDataSchema = z.object({
			customer_id: z.string().optional(),
		});

		const parsed = TransactionDataSchema.safeParse(
			(event as unknown as { data?: unknown }).data
		);
		if (!parsed.success) return;

		const customerId = parsed.data.customer_id;
		if (!customerId) return;

		const user = await prisma.user.findFirst({
			where: { paddle_customer_id: customerId },
			select: { user_id: true },
		});
		if (!user) return;

		await prisma.notification.create({
			data: {
				user_id: user.user_id,
				type: "payment_failed",
				message:
					"We couldn't process your payment. Please update your payment method to avoid service interruption.",
			},
		});
	}
}
