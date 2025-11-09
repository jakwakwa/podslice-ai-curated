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
		
		const errorMessage = error instanceof Error ? error.message : String(error);
		const is403 = errorMessage.includes("403") || errorMessage.includes("forbidden");
		
		return (
			<div className="p-4 border border-destructive rounded-md space-y-3">
				<p className="text-destructive font-semibold">
					Failed to load Paddle notification settings
				</p>
				{is403 ? (
					<div className="text-sm space-y-2">
						<p>Your Paddle API key doesn't have permission to access notification settings.</p>
						<p className="font-medium">To fix this:</p>
						<ol className="list-decimal pl-5 space-y-1">
							<li>Go to your Paddle Dashboard → Developer Tools → Authentication</li>
							<li>Create a new API key or update your existing key</li>
							<li>Ensure it has <strong>write permissions</strong> and access to <strong>notification settings</strong></li>
							<li>Update your <code className="bg-muted px-1 py-0.5 rounded">PADDLE_API_KEY</code> environment variable</li>
						</ol>
					</div>
				) : (
					<p className="text-sm">{errorMessage}</p>
				)}
			</div>
		);
	}
}
