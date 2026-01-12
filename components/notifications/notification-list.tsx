"use client";

import type { Notification } from "@/lib/types";
import NotificationItem from "@/components/notifications/notification-item";

interface NotificationListProps {
	notifications: Notification[];
	onMarkAsRead: (notificationId: string) => void | Promise<void>;
	onDelete: (notificationId: string) => void | Promise<void>;
	isMutating?: boolean;
}

export default function NotificationList({
	notifications,
	onMarkAsRead,
	onDelete,
	isMutating = false,
}: NotificationListProps) {
	return (
		<div className="w-full flex flex-col gap-2 px-2 py-2">
			{notifications.slice(0, 10).map(notification => (
				<NotificationItem
					key={notification.notification_id}
					notification={notification}
					onMarkAsRead={onMarkAsRead}
					onDelete={onDelete}
					isMutating={isMutating}
				/>
			))}
		</div>
	);
}
