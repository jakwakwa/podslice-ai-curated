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

type PaymentFailureContext = {
	amount?: string | number | null;
	currencyCode?: string | null;
	failureReason?: string | null;
	nextRetryAt?: Date | null;
	paymentAttemptId?: string | null;
};

const MAX_OPERATION_RETRIES = Math.max(
	1,
	Number.parseInt(process.env.PADDLE_WEBHOOK_MAX_RETRIES ?? "3", 10)
);

const RETRYABLE_ERROR_CODES = new Set([
	"P1001",
	"P1002",
	"P1008",
	"P1017",
	"P2028",
	"P2031",
]);

const RETRYABLE_ERROR_PATTERNS = [
	/ECONNRESET/i,
	/ETIMEDOUT/i,
	/ECONNREFUSED/i,
	/Connection terminated unexpectedly/i,
	/Temporary failure in name resolution/i,
];

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
		if (!eventData?.eventType) {
			this.logWebhookSnapshot("unknown_event_type", { rawEvent: eventData });
			return;
		}

		try {
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
					this.logWebhookSnapshot("event_not_handled", {
						eventType: eventData.eventType,
						eventId: eventData.eventId,
					});
					break;
			}
		} catch (error) {
			this.logWebhookSnapshot("event_processing_failed", {
				eventType: eventData.eventType,
				eventId: eventData.eventId,
				error: this.serializeError(error),
			});
			throw error;
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

		this.logWebhookSnapshot("subscription_event_parsed", {
			eventType: event.eventType,
			subscriptionId: externalId,
			customerId: d.customer_id,
			status: d.status,
		});

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
		let user: Awaited<
			ReturnType<
				typeof prisma.user.findFirst<{
					where: { paddle_customer_id: string };
					select: { user_id: true; paddle_customer_id: true };
				}>
			>
		> = await this.executeWithRetry("subscription_user_lookup", () =>
			prisma.user.findFirst({
				where: { paddle_customer_id: customerId },
				select: { user_id: true, paddle_customer_id: true },
			})
		);

		// Fallback: if user not found by customer ID, try to fetch customer email from Paddle and link by email
		// This handles race conditions where subscription event arrives before customer event or during simulation
		if (!user && customerId) {
			try {
				const { getPaddleInstance } = await import("@/utils/paddle/get-paddle-instance");
				const paddle = getPaddleInstance();
				const customer = await paddle.customers.get(customerId);

				if (customer.email) {
					// Try to find user by email and update paddle_customer_id
					const updatedUser: Awaited<
						ReturnType<
							typeof prisma.user.update<{
								where: { email: string };
								data: { paddle_customer_id: string };
								select: { user_id: true; paddle_customer_id: true };
							}>
						>
					> = await this.executeWithRetry("user_link_fallback_update", () =>
						prisma.user.update({
							where: { email: customer.email },
							data: { paddle_customer_id: customerId },
							select: { user_id: true, paddle_customer_id: true },
						})
					);
					if (updatedUser) {
						user = updatedUser;
						this.logWebhookSnapshot("user_linked_via_api_lookup", {
							eventType: event.eventType,
							customerId,
							email: customer.email,
							userId: user.user_id,
						});
					}
				}
			} catch (error) {
				this.logWebhookSnapshot("user_link_fallback_failed", {
					eventType: event.eventType,
					customerId,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		if (!user) {
			this.logWebhookSnapshot("user_not_found_for_customer", {
				eventType: event.eventType,
				customerId,
				subscriptionId: externalId,
			});
			return;
		}

		// Deterministic subscription resolution: attempt findUnique by paddle_subscription_id
		let existingSubscription: Awaited<
			ReturnType<
				typeof prisma.subscription.findUnique<{
					where: { paddle_subscription_id: string };
					select: {
						subscription_id: true;
						user_id: true;
						status: true;
						plan_type: true;
					};
				}>
			>
		> = await this.executeWithRetry("subscription_lookup_by_paddle_id", () =>
			prisma.subscription.findUnique({
				where: { paddle_subscription_id: externalId },
				select: { subscription_id: true, user_id: true, status: true, plan_type: true },
			})
		);

		// If not found, check if user has a subscription with NULL or mismatched paddle_subscription_id
		if (!existingSubscription) {
			const userSubscriptions: Awaited<
				ReturnType<
					typeof prisma.subscription.findMany<{
						where: { user_id: string };
						select: {
							subscription_id: true;
							paddle_subscription_id: true;
							status: true;
							plan_type: true;
						};
					}>
				>
			> = await this.executeWithRetry("subscription_lookup_by_user", () =>
				prisma.subscription.findMany({
					where: { user_id: user.user_id },
					select: {
						subscription_id: true,
						paddle_subscription_id: true,
						status: true,
						plan_type: true,
					},
				})
			);

			// Look for a subscription with NULL or invalid paddle_subscription_id that we can claim
			const unclaimedSub = userSubscriptions.find(
				(s: (typeof userSubscriptions)[number]) => {
					const hasNoPaddleId = !s.paddle_subscription_id;
					const hasInvalidFormat =
						s.paddle_subscription_id && !s.paddle_subscription_id.startsWith("sub_");
					return hasNoPaddleId || hasInvalidFormat;
				}
			);

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

		const trial_start =
			d.trial_end_at || status === "trialing"
				? (current_period_start ?? (d.started_at ? new Date(d.started_at) : null))
				: null;

		const updateData = {
			paddle_price_id: priceId,
			plan_type: newPlanType ?? undefined,
			status,
			current_period_start,
			current_period_end,
			trial_start: trial_start ?? undefined,
			trial_end,
			canceled_at,
			cancel_at_period_end,
		};

		// Usage is now tracked by counting UserEpisode records, no need to reset counters

		if (existingSubscription) {
			await this.executeWithRetry("subscription_update_existing", () =>
				prisma.subscription.update({
					where: { subscription_id: existingSubscription!.subscription_id },
					data: {
						paddle_subscription_id: externalId,
						...updateData,
					},
				})
			);
		} else {
			await this.executeWithRetry("subscription_create_from_webhook", () =>
				prisma.subscription.create({
					data: {
						user_id: user.user_id,
						paddle_subscription_id: externalId,
						...updateData,
					},
				})
			);
		}

		// Notifications are now handled by Paddle's native email system
		// No in-app notifications are dispatched here to avoid duplication
		this.logWebhookSnapshot("subscription_updated_db_only", {
			eventType: event.eventType,
			subscriptionId: externalId,
			userId: user.user_id,
			status,
		});
	}

	private extractPaymentFailureContext(
		data: Record<string, unknown>
	): PaymentFailureContext | undefined {
		const payoutTotals =
			(data.payout_total as Record<string, unknown> | undefined) ?? null;
		const details = (data.details as Record<string, unknown> | undefined) ?? null;
		const amount = this.extractAmountValue([
			data.amount,
			data.original_amount,
			payoutTotals?.amount,
			(details?.amount as unknown) ?? null,
		]);
		const currencyCode =
			this.extractString(data.currency_code) ||
			this.extractString(data.currency) ||
			this.extractString(payoutTotals?.currency_code) ||
			this.extractString(details?.currency_code);
		const failureReason =
			this.extractString(data.failure_reason) ||
			this.extractString(details?.failure_reason);
		const nextRetryAt =
			this.parseDate(
				this.extractString(data.next_payment_attempt_at) ||
					this.extractString(data.next_payment_attempt) ||
					this.extractString(data.next_retry_at) ||
					this.extractString(data.retry_at) ||
					this.extractString(details?.next_payment_attempt_at)
			) ?? null;
		const paymentAttemptId =
			this.extractString(data.payment_attempt_id) ||
			this.extractString(details?.payment_attempt_id);
	private async createSubscriptionNotifications(
		params: {
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
		},
		paymentFailureContext?: PaymentFailureContext
	) {
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

		if (!(amount || currencyCode || failureReason || nextRetryAt || paymentAttemptId)) {
			return undefined;
		// New subscription activated
		if (isNewSubscription && status === "active") {
			await this.dispatchNotification({
				user_id: userId,
				type: "subscription_activated",
				message: `Your ${this.formatPlanName(newPlanType)} subscription is now active!`,
			});
			return;
		}

		return {
			amount,
			currencyCode,
			failureReason,
			nextRetryAt,
			paymentAttemptId,
		};
	}
		// Subscription renewed
		if (statusChanged && oldStatus === "past_due" && status === "active") {
			await this.dispatchNotification({
				user_id: userId,
				type: "subscription_renewed",
				message: "Your subscription has been successfully renewed.",
			});
			return;
		}

	private extractAmountValue(values: unknown[]): string | number | null {
		for (const value of values) {
			if (typeof value === "number" && Number.isFinite(value)) return value;
			if (typeof value === "string" && value.trim().length > 0) return value;
		// Subscription cancelled (status changed to canceled)
		if (statusChanged && status === "canceled") {
			await this.dispatchNotification({
				user_id: userId,
				type: "subscription_cancelled",
				message:
					"Your subscription has been cancelled. You'll retain access until the end of your billing period.",
			});
			return;
		}
		return null;
	}

	private extractString(value: unknown): string | null {
		if (typeof value === "string" && value.trim().length > 0) {
			return value;
		// Payment failed (trigger if status changed or explicit payment failure context provided)
		const shouldNotifyPastDue =
			status === "past_due" && (statusChanged || Boolean(paymentFailureContext));
		if (shouldNotifyPastDue) {
			const message = this.buildPaymentFailureMessage(paymentFailureContext);
			await this.dispatchNotification({
				user_id: userId,
				type: "payment_failed",
				message,
			});
			return;
		}
		return null;

		// Plan upgraded/downgraded
		if (planChanged && newPlanType && oldPlanType) {
			const isUpgrade = this.isUpgrade(oldPlanType, newPlanType);
			await this.dispatchNotification({
				user_id: userId,
				type: isUpgrade ? "subscription_upgraded" : "subscription_downgraded",
				message: `Your plan has been ${isUpgrade ? "upgraded" : "changed"} to ${this.formatPlanName(newPlanType)}.`,
			});
			return;
		}

		// Scheduled cancellation (cancel_at_period_end set without status change yet)
		if (cancelAtPeriodEnd && currentPeriodEnd && !statusChanged) {
			const endDate = currentPeriodEnd.toLocaleDateString();
			await this.dispatchNotification({
				user_id: userId,
				type: "subscription_ending",
				message: `Your subscription will end on ${endDate}. You can reactivate it anytime before then.`,
			});
			return;
		}
	}

	private parseDate(value: string | null): Date | null {
		if (!value) return null;
		const parsed = Date.parse(value);
		if (Number.isNaN(parsed)) return null;
		return new Date(parsed);
	}

	private isUpgrade(oldPlan: string, newPlan: string): boolean {
		const planHierarchy = ["casual_listener", "regular_listener", "power_listener"];
		const oldIndex = planHierarchy.indexOf(oldPlan);
		const newIndex = planHierarchy.indexOf(newPlan);
		return newIndex > oldIndex;
	}
	private buildPaymentFailureMessage(context?: PaymentFailureContext): string {
		if (!context) {
			return "We couldn't process your payment. Please update your payment method to continue your subscription.";
		}

		const segments: string[] = ["We couldn't process your payment."];
		const amountDisplay = this.formatAmountDisplay(context.amount, context.currencyCode);
		if (amountDisplay) {
			segments.push(`Amount: ${amountDisplay}.`);
		}
		if (context.failureReason) {
			segments.push(`Reason: ${context.failureReason}.`);
		}
		if (context.nextRetryAt) {
			segments.push(`We'll retry on ${context.nextRetryAt.toLocaleString()}.`);
		}
		segments.push("Please update your payment method to avoid service interruption.");

		return segments.join(" ");
	}

	private formatAmountDisplay(
		amount?: string | number | null,
		currencyCode?: string | null
	): string | null {
		if (amount === undefined || amount === null) return null;
		const currency = currencyCode?.toUpperCase() || "USD";
		const numericAmount =
			typeof amount === "number"
				? amount
				: Number.isNaN(Number.parseFloat(amount))
					? null
					: Number.parseFloat(amount);

		if (numericAmount === null) {
			return `${currency} ${amount}`.trim();
		}

		try {
			return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
				numericAmount
			);
		} catch {
			return `${currency} ${numericAmount.toFixed(2)}`.trim();
		}
	}

	private async dispatchNotification(data: {
		user_id: string;
		type: string;
		message: string;
	}) {
		await this.executeWithRetry("notification_create", () =>
			prisma.notification.create({ data })
		);
	}

	private parseDate(value: string | null): Date | null {
		if (!value) return null;
		const parsed = Date.parse(value);
		if (Number.isNaN(parsed)) return null;
		return new Date(parsed);
	}
	private async handleSubscriptionCancellation(userId: string) {
		const episodes: Awaited<
			ReturnType<typeof prisma.userEpisode.findMany<{ where: { user_id: string } }>>
		> = await this.executeWithRetry("user_episode_lookup_for_cancellation", () =>
			prisma.userEpisode.findMany({
				where: { user_id: userId },
			})
		);

		if (episodes.length > 0) {
			try {
				const storage = getStorageUploader();
				const bucketName = ensureBucketName();

				const deletePromises = episodes.map((episode: (typeof episodes)[number]) => {
					if (episode.gcs_audio_url) {
						const objectName = episode.gcs_audio_url.replace(`gs://${bucketName}/`, "");
						return storage.bucket(bucketName).file(objectName).delete();
					}
					return Promise.resolve();
				});

				await Promise.all(deletePromises);
				await this.executeWithRetry("user_episode_bulk_delete", () =>
					prisma.userEpisode.deleteMany({ where: { user_id: userId } })
				);
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
		await this.executeWithRetry("customer_update_by_email", () =>
			prisma.user.updateMany({
				where: { email, paddle_customer_id: null },
				data: { paddle_customer_id: id },
			})
		);
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

		const user: Awaited<
			ReturnType<
				typeof prisma.user.findFirst<{
					where: { paddle_customer_id: string };
					select: { user_id: true };
				}>
			>
		> = await this.executeWithRetry("payment_success_user_lookup", () =>
			prisma.user.findFirst({
				where: { paddle_customer_id: customerId },
				select: { user_id: true },
			})
		);
		if (!user) return;

		// Only notify for recurring payments (not initial subscription)
		if (parsed.data.subscription_id) {
			const subscription: Awaited<
				ReturnType<
					typeof prisma.subscription.findFirst<{
						where: {
							paddle_subscription_id: string;
							user_id: string;
						};
						select: { created_at: true };
					}>
				>
			> = await this.executeWithRetry("payment_success_subscription_lookup", () =>
				prisma.subscription.findFirst({
					where: {
						paddle_subscription_id: parsed.data.subscription_id,
						user_id: user.user_id,
					},
					select: { created_at: true },
				})
			);

			// If subscription is older than 1 day, this is a renewal payment
			if (subscription && Date.now() - subscription.created_at.getTime() > 86400000) {
				this.logWebhookSnapshot("payment_success_renewal_logged", {
					userId: user.user_id,
					subscriptionId: parsed.data.subscription_id,
				});
			}
		}
	}

	private async handlePaymentFailed(event: TransactionPaymentFailedEvent) {
		const PaymentFailedSchema = z
			.object({
				customer_id: z.string().optional(),
				subscription_id: z.string().optional(),
				currency_code: z.string().optional(),
				currency: z.string().optional(),
				amount: z.union([z.string(), z.number()]).optional(),
				original_amount: z.union([z.string(), z.number()]).optional(),
				payout_total: z
					.object({
						amount: z.union([z.string(), z.number()]).optional(),
						currency_code: z.string().optional(),
					})
					.optional(),
				failure_reason: z.string().optional(),
				retry_at: z.string().optional(),
				next_payment_attempt: z.string().optional(),
				next_payment_attempt_at: z.string().optional(),
				next_retry_at: z.string().optional(),
				payment_attempt_id: z.string().optional(),
				details: z
					.object({
						failure_reason: z.string().optional(),
						next_payment_attempt_at: z.string().optional(),
					})
					.partial()
					.optional(),
			})
			.passthrough();

		const parsed = PaymentFailedSchema.safeParse(
			(event as unknown as { data?: unknown }).data
		);
		if (!parsed.success) {
			this.logWebhookSnapshot("payment_failed_parse_error", {
				eventType: event.eventType,
				parseError: parsed.error,
			});
			return;
		}

		const data = parsed.data;
		const customerId = data.customer_id;
		if (!customerId) {
			this.logWebhookSnapshot("payment_failed_missing_customer", {
				eventType: event.eventType,
				subscriptionId: data.subscription_id,
			});
			return;
		}

		const user: Awaited<
			ReturnType<
				typeof prisma.user.findFirst<{
					where: { paddle_customer_id: string };
					select: { user_id: true };
				}>
			>
		> = await this.executeWithRetry("payment_failed_user_lookup", () =>
			prisma.user.findFirst({
				where: { paddle_customer_id: customerId },
				select: { user_id: true },
			})
		);
		if (!user) {
			this.logWebhookSnapshot("payment_failed_user_not_found", {
				customerId,
				subscriptionId: data.subscription_id,
			});
			return;
		}

		const subscriptionByPaddle: Awaited<
			ReturnType<
				typeof prisma.subscription.findUnique<{
					where: { paddle_subscription_id: string };
					select: {
						subscription_id: true;
						user_id: true;
						status: true;
						plan_type: true;
						cancel_at_period_end: true;
						current_period_end: true;
						paddle_subscription_id: true;
					};
				}>
			>
		> | null = data.subscription_id
			? await this.executeWithRetry("payment_failed_subscription_lookup_by_paddle", () =>
					prisma.subscription.findUnique({
						where: { paddle_subscription_id: data.subscription_id },
						select: {
							subscription_id: true,
							user_id: true,
							status: true,
							plan_type: true,
							cancel_at_period_end: true,
							current_period_end: true,
							paddle_subscription_id: true,
						},
					})
				)
			: null;

		let subscription: Awaited<
			ReturnType<
				typeof prisma.subscription.findFirst<{
					where: { user_id: string };
					orderBy: { updated_at: "desc" };
					select: {
						subscription_id: true;
						user_id: true;
						status: true;
						plan_type: true;
						cancel_at_period_end: true;
						current_period_end: true;
						paddle_subscription_id: true;
					};
				}>
			>
		> | null = subscriptionByPaddle;
		if (!subscription) {
			subscription = await this.executeWithRetry(
				"payment_failed_subscription_lookup_latest_by_user",
				() =>
					prisma.subscription.findFirst({
						where: { user_id: user.user_id },
						orderBy: { updated_at: "desc" },
						select: {
							subscription_id: true,
							user_id: true,
							status: true,
							plan_type: true,
							cancel_at_period_end: true,
							current_period_end: true,
							paddle_subscription_id: true,
						},
					})
			);
		}

		if (!subscription) {
			this.logWebhookSnapshot("payment_failed_subscription_not_found", {
				customerId,
				subscriptionId: data.subscription_id,
			});
			return;
		}

		if (subscription.user_id !== user.user_id) {
			this.logWebhookSnapshot("payment_failed_subscription_user_mismatch", {
				customerId,
				subscriptionId: subscription.paddle_subscription_id ?? data.subscription_id,
				expectedUserId: user.user_id,
				actualUserId: subscription.user_id,
			});
			return;
		}

		const failureContext = this.extractPaymentFailureContext(data);

		const statusChanged = subscription.status !== "past_due";
		if (statusChanged) {
			await this.executeWithRetry("subscription_mark_past_due", () =>
				prisma.subscription.update({
					where: { subscription_id: subscription.subscription_id },
					data: { status: "past_due" },
				})
			);
		}

		this.logWebhookSnapshot("payment_failed_status_updated", {
			userId: user.user_id,
			subscriptionId: subscription.subscription_id,
			statusChanged,
			failureContext,
		});

		this.logWebhookSnapshot("payment_failed_processed", {
			customerId,
			subscriptionId: subscription.paddle_subscription_id ?? data.subscription_id,
			statusChanged,
			paymentAttemptId: failureContext?.paymentAttemptId,
		});
	}

	private async executeWithRetry<T>(
		operationName: string,
		operation: () => Promise<T>,
		attempt = 1
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			const shouldRetry = this.isTransientError(error) && attempt < MAX_OPERATION_RETRIES;
			this.logWebhookSnapshot("operation_failure", {
				operationName,
				attempt,
				shouldRetry,
				error: this.serializeError(error),
			});
			if (!shouldRetry) {
				throw error;
			}
			const backoff = Math.min(1000, 50 * 2 ** (attempt - 1));
			await this.wait(backoff);
			return this.executeWithRetry(operationName, operation, attempt + 1);
		}
	}

	private isTransientError(error: unknown): boolean {
		if (!error || typeof error !== "object") return false;
		const code = (error as { code?: string }).code;
		if (code && RETRYABLE_ERROR_CODES.has(code)) {
			return true;
		}
		const message =
			(error as { message?: string }).message ||
			(error as { error?: string }).error ||
			"";
		if (typeof message === "string") {
			return RETRYABLE_ERROR_PATTERNS.some(pattern => pattern.test(message));
		}
		return false;
	}

	private serializeError(error: unknown) {
		if (error instanceof Error) {
			return {
				name: error.name,
				message: error.message,
				stack: error.stack,
				code: (error as { code?: string }).code,
			};
		}
		if (error && typeof error === "object") {
			return Object.fromEntries(
				Object.entries(error).filter(([, value]) =>
					["string", "number", "boolean"].includes(typeof value)
				)
			);
		}
		return { value: String(error) };
	}

	private async wait(ms: number) {
		await new Promise(resolve => setTimeout(resolve, ms));
	}
}
