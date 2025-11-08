import { auth } from "@clerk/nextjs/server";
import { listEventTypes, listNotificationSettings } from "@/lib/paddle-server/paddle";
import { prisma } from "@/lib/prisma";
import PaddleNotificationsPanelClient from "./PaddleNotificationsPanel.client";

export default async function PaddleNotificationsPanel() {
	const { userId } = await auth();

	if (!userId) {
		return (
			<div className="p-4 border border-destructive rounded-md">
				<p className="text-destructive">Unauthorized. Please sign in.</p>
			</div>
		);
	}

	const user = await prisma.user.findUnique({
		where: { user_id: userId },
		select: { is_admin: true },
	});

	if (!user?.is_admin) {
		return (
			<div className="p-4 border border-destructive rounded-md">
				<p className="text-destructive">
					Access denied. This page is only available to administrators.
				</p>
			</div>
		);
	}

	try {
		const [eventTypesResult, notificationSettingsResult] = await Promise.all([
			listEventTypes(),
			listNotificationSettings(),
		]);

		const eventTypes = Array.isArray(eventTypesResult?.data) ? eventTypesResult.data : [];
		const notificationSettings = Array.isArray(notificationSettingsResult?.data)
			? notificationSettingsResult.data
			: [];

		return (
			<PaddleNotificationsPanelClient
				eventTypes={eventTypes}
				notificationSettings={notificationSettings}
			/>
		);
	} catch (error) {
		console.error("[PADDLE_NOTIFICATIONS_PANEL]", error);
		return (
			<div className="p-4 border border-destructive rounded-md">
				<p className="text-destructive">
					Failed to load Paddle notification settings. Please check your Paddle API
					configuration.
				</p>
			</div>
		);
	}
}
