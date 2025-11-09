import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TEST_NOTIFICATION_MESSAGES: Record<string, string> = {
	episode_ready: "🎉 Your weekly podcast episode 'The Future of AI: Testing Edition' is ready to listen!",
	weekly_reminder: "📅 Your weekly podcast digest is ready!",
	subscription_activated: "🎊 Your Power Listener subscription is now active!",
	subscription_renewed: "✅ Your subscription has been successfully renewed.",
	subscription_cancelled: "❌ Your subscription has been cancelled. You'll retain access until the end of your billing period.",
	subscription_ending: "⚠️ Your subscription will end on 12/31/2025. You can reactivate it anytime before then.",
	payment_failed: "💳 We couldn't process your payment. Please update your payment method to avoid service interruption.",
	payment_successful: "💰 Your payment was processed successfully. Thank you!",
	subscription_upgraded: "📈 Your plan has been upgraded to Power Listener.",
	subscription_downgraded: "📉 Your plan has been changed to Casual Listener.",
}

export async function POST(request: Request) {
	try {
		const { userId } = await auth()

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 })
		}

		// Get notification type from query params
		const { searchParams } = new URL(request.url)
		const notificationType = searchParams.get("type") || "episode_ready"

		// Validate notification type
		if (!TEST_NOTIFICATION_MESSAGES[notificationType]) {
			return NextResponse.json(
				{ 
					error: "Invalid notification type", 
					validTypes: Object.keys(TEST_NOTIFICATION_MESSAGES) 
				}, 
				{ status: 400 }
			)
		}

		// Create a test notification
		const notification = await prisma.notification.create({
			data: {
				notification_id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				user_id: userId,
				type: notificationType,
				message: TEST_NOTIFICATION_MESSAGES[notificationType],
				is_read: false,
			},
		})

		return NextResponse.json({
			success: true,
			notification,
			message: `Test ${notificationType} notification created successfully!`,
		})
	} catch (error) {
		console.error("[NOTIFICATIONS_TEST_POST]", error)
		return NextResponse.json({ error: "Failed to create test notification" }, { status: 500 })
	}
}
