import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateSubscription } from "@/lib/paddle-server/paddle";
import { prisma } from "@/lib/prisma";

const swapSchema = z.object({
	priceId: z.string().min(1),
});

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const parsed = swapSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
		}

		const { priceId } = parsed.data;

		const existing = await prisma.subscription.findFirst({
			where: { user_id: userId, OR: [{ status: "active" }, { status: "trialing" }, { status: "paused" }] },
			orderBy: { created_at: "desc" },
		});
		if (!existing?.paddle_subscription_id) {
			return NextResponse.json({ error: "No active subscription to swap" }, { status: 404 });
		}

		// Schedule plan change for next billing period (no immediate proration)
		await updateSubscription(existing.paddle_subscription_id, {
			items: [{ price_id: priceId, quantity: 1 }],
			proration_billing_mode: "next_billing_period",
		});

		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("[SUBSCRIPTION_SWAP]", e);
		return NextResponse.json({ error: "Failed to schedule plan swap" }, { status: 500 });
	}
}
