import { type CustomerCreatedEvent, type CustomerUpdatedEvent, type EventEntity, EventName, type SubscriptionCreatedEvent, type SubscriptionUpdatedEvent } from "@paddle/paddle-node-sdk";
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
		}
	}

	private async updateSubscriptionData(event: SubscriptionCreatedEvent | SubscriptionUpdatedEvent) {
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

		const parsed = SubscriptionDataSchema.safeParse((event as unknown as { data?: unknown }).data);
		if (!parsed.success) return;

		const d = parsed.data;
		const externalId = d.id ?? d.subscription_id;
		if (!externalId) return;

		const priceId = d.items?.[0]?.price?.id ?? d.items?.[0]?.price_id ?? null;
		const status = typeof d.status === "string" ? d.status : "active";
		const current_period_start = d.current_billing_period?.starts_at ? new Date(d.current_billing_period.starts_at) : d.started_at ? new Date(d.started_at) : null;
		const current_period_end = d.current_billing_period?.ends_at ? new Date(d.current_billing_period.ends_at) : d.next_billed_at ? new Date(d.next_billed_at) : null;
		const trial_end = d.trial_end_at ? new Date(d.trial_end_at) : null;
		const canceled_at = d.canceled_at ? new Date(d.canceled_at) : null;
		const cancel_at_period_end = Boolean(d.cancel_at_end || d.cancel_at_period_end);

		const customerId = d.customer_id;
		if (!customerId) return;

		const user = await prisma.user.findFirst({ where: { paddle_customer_id: customerId }, select: { user_id: true } });
		if (!user) return;

		if (status === "canceled") {
			await this.handleSubscriptionCancellation(user.user_id);
		}

		const updateData = {
			paddle_price_id: priceId,
			plan_type: priceIdToPlanType(priceId) ?? undefined,
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
				console.error(`Failed to delete GCS files or user episodes for user ${userId}:`, error);
				// Don't throw here, as we still want to update the subscription status
			}
		}
	}

	private async updateCustomerData(event: CustomerCreatedEvent | CustomerUpdatedEvent) {
		const CustomerDataSchema = z.object({ id: z.string(), email: z.string().email().optional() });
		const parsed = CustomerDataSchema.safeParse((event as unknown as { data?: unknown }).data);
		if (!parsed.success) return;
		const { id, email } = parsed.data;
		if (!email) return;
		await prisma.user.updateMany({ where: { email, paddle_customer_id: null }, data: { paddle_customer_id: id } });
	}
}
