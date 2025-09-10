import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSubscriptionsByCustomer } from "@/lib/paddle-server/paddle";
import { prisma } from "@/lib/prisma";
import { priceIdToPlanType } from "@/utils/paddle/plan-utils";

const checkoutCompletedSchema = z.object({
	transaction_id: z.string(),
	status: z.string(),
	customer: z.object({
		id: z.string(),
	}),
	items: z.array(
		z.object({
			price_id: z.string(),
		})
	),
	// Add other fields as necessary
});

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const body = await request.json();
		const parsedBody = checkoutCompletedSchema.safeParse(body);
		if (!parsedBody.success) {
			return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
		}

		const { transaction_id, customer, items } = parsedBody.data;
		const priceId = items[0]?.price_id;

		if (!priceId) {
			return NextResponse.json({ error: "Missing price_id in request" }, { status: 400 });
		}

		// Ensure a local user record exists and attach Paddle customer id (minimal requirements to save subscription)
		try {
			const clerk = await currentUser();
			await prisma.user.upsert({
				where: { user_id: userId },
				update: { paddle_customer_id: customer.id },
				create: {
					user_id: userId,
					name: clerk?.fullName || clerk?.firstName || "Unknown",
					email: clerk?.emailAddresses?.[0]?.emailAddress || `unknown+${userId}@example.com`,
					password: "clerk_managed",
					image: clerk?.imageUrl || null,
					email_verified: clerk?.emailAddresses?.[0]?.verification?.status === "verified" ? new Date() : null,
					paddle_customer_id: customer.id,
				},
			});
		} catch (ensureUserErr) {
			// If user upsert fails for any reason, do not block subscription creation unnecessarily
			console.error("[SUBSCRIPTION_POST] Failed to ensure user exists:", ensureUserErr);
		}

		// Attempt enrichment with Paddle subscription period dates
		let current_period_start: Date | null = null;
		let current_period_end: Date | null = null;
		let externalSubscriptionId: string | null = null;
		try {
			const paddleResp = await getSubscriptionsByCustomer(customer.id);
			const PaddleSubscriptionItemSchema = z.object({
				id: z.string().optional(),
				subscription_id: z.string().optional(),
				status: z.string().optional(),
				current_billing_period: z
					.object({
						starts_at: z.string().optional(),
						ends_at: z.string().optional(),
					})
					.optional(),
				started_at: z.string().optional(),
				next_billed_at: z.string().optional(),
			});
			const raw = Array.isArray(paddleResp?.data) ? paddleResp.data : Array.isArray(paddleResp) ? paddleResp : [];
			const parsed = z.array(PaddleSubscriptionItemSchema).safeParse(raw);
			const subs = parsed.success ? parsed.data : [];
			if (subs.length > 0) {
				const preferred = subs.find(s => s?.status === "active") ?? subs.find(s => s?.status === "trialing") ?? subs[0];
				externalSubscriptionId = preferred?.id ?? preferred?.subscription_id ?? null;
				const starts = preferred?.current_billing_period?.starts_at || preferred?.started_at || null;
				const ends = preferred?.current_billing_period?.ends_at || preferred?.next_billed_at || null;
				current_period_start = starts ? new Date(starts) : null;
				current_period_end = ends ? new Date(ends) : null;
			}
		} catch {}

		// Enforce single active-like subscription per user locally
		const existingActive = await prisma.subscription.findFirst({
			where: {
				user_id: userId,
				OR: [{ status: "active" }, { status: "trialing" }, { status: "paused" }],
			},
		});
		if (existingActive && (externalSubscriptionId ? existingActive.paddle_subscription_id !== externalSubscriptionId : true)) {
			return NextResponse.json({ error: "You already have an active subscription. Manage or change your plan instead of purchasing a new one." }, { status: 409 });
		}

		// Be idempotent: upsert by unique paddle_subscription_id (fall back to transaction_id if Paddle sub id is missing)
		const uniqueExternalId = externalSubscriptionId || transaction_id;
		const newSubscription = await prisma.subscription.upsert({
			where: { paddle_subscription_id: uniqueExternalId },
			create: {
				user_id: userId,
				paddle_subscription_id: uniqueExternalId,
				paddle_price_id: priceId,
				plan_type: priceIdToPlanType(priceId) ?? undefined,
				status: "active",
				current_period_start,
				current_period_end,
			},
			update: {
				paddle_price_id: priceId,
				plan_type: priceIdToPlanType(priceId) ?? undefined,
				status: "active",
				current_period_start,
				current_period_end,
			},
		});

		return NextResponse.json(newSubscription, { status: 201 });
	} catch (error) {
		console.error("[SUBSCRIPTION_POST]", error);
		return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
	}
}

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new Response("Unauthorized", { status: 401 });
		}
		const findLatest = async () =>
			prisma.subscription.findFirst({
				where: { user_id: userId },
				orderBy: { created_at: "desc" },
			});
		let subscription = await findLatest();
		// Retry once on transient connection closure
		if (!subscription) {
			try {
				subscription = await findLatest();
			} catch {}
		}
		if (!subscription) {
			return new Response(null, { status: 204 });
		}

		// Add caching headers - cache for 5 minutes since subscription data doesn't change frequently
		const response = NextResponse.json(subscription);
		response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
		return response;
	} catch (error) {
		console.error("Failed to fetch subscription", error);
		return new Response("Internal Server Error", { status: 500 });
	}
}
