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

/**
 * GET endpoint - Lists available notification types for testing
 */
export async function GET() {
	try {
		const { userId } = await auth()

		if (!userId) {
			return new NextResponse("Unauthorized", { status: 401 })
		}

		return NextResponse.json({
			availableTypes: Object.keys(TEST_NOTIFICATION_MESSAGES),
			usage: "POST to this endpoint with ?type=<notification_type> or ?all=true to create test notifications",
			examples: {
				single: "/api/notifications/test?type=subscription_activated",
				all: "/api/notifications/test?all=true"
			}
		})
	} catch (error) {
		console.error("[NOTIFICATIONS_TEST_GET]", error)
		return NextResponse.json({ error: "Failed to list notification types" }, { status: 500 })
	}
}

/**
 * POST endpoint - Creates test notifications
 */
export async function POST(request: Request) {
	try {
		const { userId } = await auth()

		if (!userId) {
			console.error("[NOTIFICATIONS_TEST_POST] Unauthorized access attempt")
			return new NextResponse("Unauthorized", { status: 401 })
		}

		console.log(`[NOTIFICATIONS_TEST_POST] Creating test notification for user ${userId}`)

		// Check if user has notifications enabled
		const user = await prisma.user.findUnique({
			where: { user_id: userId },
			select: { in_app_notifications: true }
		})

		if (!user) {
			console.error(`[NOTIFICATIONS_TEST_POST] User ${userId} not found`)
			return NextResponse.json({ error: "User not found" }, { status: 404 })
		}

		if (!user.in_app_notifications) {
			console.warn(`[NOTIFICATIONS_TEST_POST] User ${userId} has disabled in-app notifications`)
			return NextResponse.json({ 
				warning: "In-app notifications are disabled for your account",
				message: "Enable notifications in your account settings to receive them"
			}, { status: 200 })
		}

		// Get notification type from query params
		const { searchParams } = new URL(request.url)
		const notificationType = searchParams.get("type")
		const createAll = searchParams.get("all") === "true"

		// Create all notification types if requested
		if (createAll) {
			console.log(`[NOTIFICATIONS_TEST_POST] Creating all test notification types for user ${userId}`)
			const notifications = []
			
			for (const [type, message] of Object.entries(TEST_NOTIFICATION_MESSAGES)) {
				try {
					const notification = await prisma.notification.create({
						data: {
							user_id: userId,
							type,
							message,
							is_read: false,
						},
					})
					notifications.push(notification)
					console.log(`[NOTIFICATIONS_TEST_POST] Created ${type} notification ${notification.notification_id}`)
				} catch (error) {
					console.error(`[NOTIFICATIONS_TEST_POST] Failed to create ${type} notification:`, error)
				}
			}

			return NextResponse.json({
				success: true,
				count: notifications.length,
				notifications,
				message: `Created ${notifications.length} test notifications!`,
			})
		}

		// Create single notification
		const typeToCreate = notificationType || "episode_ready"

		// Validate notification type
		if (!TEST_NOTIFICATION_MESSAGES[typeToCreate]) {
			console.error(`[NOTIFICATIONS_TEST_POST] Invalid notification type: ${typeToCreate}`)
			return NextResponse.json(
				{ 
					error: "Invalid notification type", 
					validTypes: Object.keys(TEST_NOTIFICATION_MESSAGES) 
				}, 
				{ status: 400 }
			)
		}

		// Create a test notification
		console.log(`[NOTIFICATIONS_TEST_POST] Creating ${typeToCreate} notification for user ${userId}`)
		const notification = await prisma.notification.create({
			data: {
				user_id: userId,
				type: typeToCreate,
				message: TEST_NOTIFICATION_MESSAGES[typeToCreate],
				is_read: false,
			},
		})

		console.log(`[NOTIFICATIONS_TEST_POST] Successfully created notification ${notification.notification_id}`)

		return NextResponse.json({
			success: true,
			notification,
			message: `Test ${typeToCreate} notification created successfully!`,
		})
	} catch (error) {
		const err = error as Error
		console.error("[NOTIFICATIONS_TEST_POST] Error:", {
			message: err.message,
			stack: err.stack
		})
		return NextResponse.json({ error: "Failed to create test notification" }, { status: 500 })
	}
}
