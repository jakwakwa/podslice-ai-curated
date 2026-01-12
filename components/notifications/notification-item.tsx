"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, Check, Clock, Podcast, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
	notification: Notification;
	onMarkAsRead: (notificationId: string) => void | Promise<void>;
	onDelete: (notificationId: string) => void | Promise<void>;
	isMutating?: boolean;
}

function getNotificationIcon(type: Notification["type"]) {
	switch (type) {
		case "episode_ready":
			return <Podcast className="w-5 h-5" color="#89D7AF" />;
		case "weekly_reminder":
			return <Calendar className="w-5 h-5" color="#FFD700" />;
		case "subscription_expiring":
			return <Clock className="w-5 h-5" color="#FFA500" />;
		case "trial_ending":
			return <Bell className="w-5 h-5" color="#FF0000" />;
		default:
			return <Bell className="w-5 h-5" color="#000000" />;
	}
}

function getNotificationColor(type: string) {
	switch (type) {
		case "episode_ready":
			return "text-green-500";
		case "weekly_reminder":
			return "text-emerald-500";
		default:
			return "text-gray-500";
	}
}

export default function NotificationItem({
	notification,
	onMarkAsRead,
	onDelete,
	isMutating = false,
}: NotificationItemProps) {
	return (
		<Card className="py-1 bg-accent-dark" key={notification.notification_id}>
			<div className=" flex flex-col">
				<div className="flex items-start justify-between py-2 ">
					<time className="text-sm text-foreground/40">
						{formatDistanceToNow(new Date(notification.created_at), {
							addSuffix: true,
						})}
					</time>
					{!notification.is_read && (
						<div className="w-2 h-2 rounded-full bg-secondary-light" />
					)}
				</div>

				<div className="flex justify-start items-center gap-4 h-full py-2">
					<span className={cn("text-base mr-2", getNotificationColor(notification.type))}>
						{getNotificationIcon(notification.type)}
					</span>
					<p className="text-body  font-medium leading-relaxed">{notification.message}</p>
				</div>

				<div className="flex gap-2 items-center justify-end">
					<Link href="/my-episodes">
						<Button variant="default" size="sm" className="text-xs px-2 ">
							My Episodes
						</Button>
					</Link>
					{!notification.is_read && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onMarkAsRead(notification.notification_id)}
							disabled={isMutating}
							className="border text-sm h-9 px-2">
							<Check size={12} />
							Mark as read
						</Button>
					)}
					<Button
						variant="destructive"
						size="sm"
						onClick={() => onDelete(notification.notification_id)}
						disabled={isMutating}
						className="text-xs px-2 py-1 h-auto">
						Clear
						<X size={12} />
					</Button>
				</div>
			</div>
		</Card>
	);
}
