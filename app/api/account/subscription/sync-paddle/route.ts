import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSubscriptionsByCustomer } from "@/lib/paddle-server/paddle";
import { prisma } from "@/lib/prisma";
import { priceIdToPlanType } from "@/utils/paddle/plan-utils";

export async function POST() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Ensure we have a Paddle customer id
		const user = await prisma.user.findUnique({ where: { user_id: userId }, select: { paddle_customer_id: true } });
		if (!user?.paddle_customer_id) {
			return NextResponse.json({ error: "No Paddle customer id on file for user" }, { status: 404 });
		}

		// Query Paddle for subscriptions tied to this customer
		const paddleResponse = await getSubscriptionsByCustomer(user.paddle_customer_id);
		const subscriptions: unknown[] = Array.isArray(paddleResponse?.data) ? paddleResponse.data : Array.isArray(paddleResponse) ? paddleResponse : [];

		if (!subscriptions || subscriptions.length === 0) {
			return NextResponse.json({ message: "No subscriptions found for this Paddle customer" }, { status: 200 });
		}

		// Prefer active, then trialing, otherwise first entry
		type PaddleSubscriptionItem = {
			id?: string;
			subscription_id?: string;
			status?: string;
			items?: Array<{ price?: { id?: string }; price_id?: string }>;
			current_billing_period?: { starts_at?: string; ends_at?: string };
			started_at?: string;
			next_billed_at?: string;
			trial_end_at?: string;
			canceled_at?: string;
			cancel_at_end?: boolean;
			cancel_at_period_end?: boolean;
		};

		const typedSubs = subscriptions as PaddleSubscriptionItem[];
		const preferred = typedSubs.find(s => s?.status === "active") ?? typedSubs.find(s => s?.status === "trialing") ?? typedSubs[0];

		const externalId: string | null = preferred?.id ?? preferred?.subscription_id ?? null;
		const priceId: string | null = preferred?.items?.[0]?.price?.id ?? preferred?.items?.[0]?.price_id ?? null;
		const status: string = typeof preferred?.status === "string" ? preferred.status : "active";
		const current_period_start: Date | null = preferred?.current_billing_period?.starts_at
			? new Date(preferred.current_billing_period.starts_at)
			: preferred?.started_at
				? new Date(preferred.started_at)
				: null;
		const current_period_end: Date | null = preferred?.current_billing_period?.ends_at
			? new Date(preferred.current_billing_period.ends_at)
			: preferred?.next_billed_at
				? new Date(preferred.next_billed_at)
				: null;
		const trial_end: Date | null = preferred?.trial_end_at ? new Date(preferred.trial_end_at) : null;
		const canceled_at: Date | null = preferred?.canceled_at ? new Date(preferred.canceled_at) : null;
		const cancel_at_period_end: boolean = Boolean(preferred?.cancel_at_end || preferred?.cancel_at_period_end);

		let synced: unknown;
		if (externalId) {
			synced = await prisma.subscription.upsert({
				where: { paddle_subscription_id: externalId },
				create: {
					user_id: userId,
					paddle_subscription_id: externalId,
					paddle_price_id: priceId,
					plan_type: priceIdToPlanType(priceId) ?? undefined,
					status,
					current_period_start,
					current_period_end,
					trial_end,
					canceled_at,
					cancel_at_period_end,
				},
				update: {
					paddle_price_id: priceId,
					plan_type: priceIdToPlanType(priceId) ?? undefined,
					status,
					current_period_start,
					current_period_end,
					trial_end,
					canceled_at,
					cancel_at_period_end,
				},
			});
		} else {
			// Fallback when we cannot determine a Paddle subscription id
			synced = await prisma.subscription.create({
				data: {
					user_id: userId,
					paddle_subscription_id: null,
					paddle_price_id: priceId,
					plan_type: priceIdToPlanType(priceId) ?? undefined,
					status,
					current_period_start,
					current_period_end,
					trial_end,
					canceled_at,
					cancel_at_period_end,
				},
			});
		}

		return NextResponse.json({ message: "Subscription synced from Paddle", subscription: synced });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[SUBSCRIPTION_SYNC_PADDLE]", message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
