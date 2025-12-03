import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		console.log(`[SUBSCRIPTION_SYNC] Checking subscriptions for user ${userId}`);

		// Check if we have any existing subscriptions in the database
		const existingSubscription = await prisma.subscription.findFirst({
			where: { user_id: userId },
			orderBy: { created_at: "desc" },
		});

		if (existingSubscription) {
			return NextResponse.json({
				message: "Found existing subscription",
				subscription: existingSubscription,
				note: "To sync with Paddle, ensure checkout completion events are properly handled",
			});
		}

		// Check if user has a Paddle customer ID
		const user = await prisma.user.findUnique({
			where: { user_id: userId },
			select: { paddle_customer_id: true },
		});

		if (user?.paddle_customer_id) {
			console.log(
				`[SUBSCRIPTION_SYNC] User has Paddle customer ID: ${user.paddle_customer_id}`
			);
			return NextResponse.json({
				message: "No subscription found in database",
				note: `User has Paddle customer ID: ${user.paddle_customer_id}. The Paddle API endpoint for customer subscriptions is currently not working.`,
				suggestion: "Ensure checkout completion events are properly captured and stored",
			});
		}

		return NextResponse.json({
			message: "No subscription or Paddle customer ID found",
			suggestion: "Complete a checkout to create a subscription record",
		});
	} catch (error) {
		console.error("[SUBSCRIPTION_SYNC]", error);
		return NextResponse.json({ error: "Failed to sync subscription" }, { status: 500 });
	}
}
