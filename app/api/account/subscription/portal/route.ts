import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomerPortalSession, getSubscriptionsByCustomer } from "@/lib/paddle-server/paddle";
import { prisma } from "@/lib/prisma";

const QuerySchema = z.object({
	subscriptionId: z.string().optional(),
});

export async function GET(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const url = new URL(request.url);
		const parsed = QuerySchema.safeParse({ subscriptionId: url.searchParams.get("subscriptionId") ?? undefined });
		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid query" }, { status: 400 });
		}

		// Ensure we have the Paddle customer id
		const user = await prisma.user.findUnique({ where: { user_id: userId }, select: { paddle_customer_id: true } });
		if (!user?.paddle_customer_id) {
			return NextResponse.json({ error: "No Paddle customer id on file for user" }, { status: 404 });
		}

		let subscriptionIds: string[] | undefined;
		if (parsed.data.subscriptionId) {
			subscriptionIds = [parsed.data.subscriptionId];
		} else {
			// Try to pick the user's active/trialing subscription from Paddle to generate deep links
			try {
				const paddleResp = await getSubscriptionsByCustomer(user.paddle_customer_id);
				const list: unknown[] = Array.isArray(paddleResp?.data) ? paddleResp.data : Array.isArray(paddleResp) ? paddleResp : [];
				type Sub = { id?: string; subscription_id?: string; status?: string };
				const subs = list as Sub[];
				const preferred = subs.find(s => s?.status === "active") ?? subs.find(s => s?.status === "trialing") ?? subs[0];
				const sid = preferred?.id ?? preferred?.subscription_id;
				if (sid) {
					subscriptionIds = [sid];
				}
			} catch {}
		}

		const session = await createCustomerPortalSession(user.paddle_customer_id, subscriptionIds);
		return NextResponse.json(session);
	} catch (e) {
		console.error("[PORTAL_SESSION]", e);
		return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
	}
}
