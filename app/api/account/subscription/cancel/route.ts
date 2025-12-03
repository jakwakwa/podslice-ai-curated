import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { scheduleCancelSubscription } from "@/lib/paddle-server/paddle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const existing = await prisma.subscription.findFirst({
			where: {
				user_id: userId,
				OR: [{ status: "active" }, { status: "trialing" }, { status: "paused" }],
			},
			orderBy: { created_at: "desc" },
		});
		if (!existing?.paddle_subscription_id) {
			return NextResponse.json(
				{ error: "No active subscription to cancel" },
				{ status: 404 }
			);
		}

		await scheduleCancelSubscription(existing.paddle_subscription_id);

		// Mark local flag so UI can reflect end-of-period cancel
		await prisma.subscription.update({
			where: { subscription_id: existing.subscription_id },
			data: { cancel_at_period_end: true },
		});

		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error("[SUBSCRIPTION_CANCEL]", e);
		return NextResponse.json(
			{ error: "Failed to schedule cancellation" },
			{ status: 500 }
		);
	}
}
