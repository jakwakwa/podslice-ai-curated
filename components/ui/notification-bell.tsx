"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, Check, CheckCircle2Icon, Podcast, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotificationStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { Typography } from "./typography";

export function NotificationBell() {
	const [isOpen, setIsOpen] = useState(false);

	const { notifications, unreadCount, isLoading, loadNotifications, markAsRead, markAllAsRead, deleteNotification, clearAll, startPolling, stopPolling, restartPolling, pausedUntilSubmission } =
		useNotificationStore();

	// Start polling when component mounts, stop when it unmounts
	useEffect(() => {
		if (!pausedUntilSubmission) {
			startPolling();
		}
		return () => {
			stopPolling();
		};
	}, [startPolling, stopPolling, pausedUntilSubmission]);

	// Restart polling when user opens the dropdown (in case auth was restored)
	useEffect(() => {
		if (isOpen) {
			// Try to restart polling when user interacts with notifications
			restartPolling();
		}
	}, [isOpen, restartPolling]);

	// Fetch when the dropdown opens (in case polling missed recent updates)
	useEffect(() => {
		if (isOpen) {
			void loadNotifications();
		}
	}, [isOpen, loadNotifications]);

	const handleMarkAsRead = async (notificationId: string) => {
		try {
			await markAsRead(notificationId);
		} catch {
			toast.error("Failed to mark notification as read");
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			await markAllAsRead();
			toast.success("All notifications marked as read");
		} catch {
			toast.error("Failed to mark all as read");
		}
	};

	const handleDeleteNotification = async (notificationId: string) => {
		try {
			await deleteNotification(notificationId);
			toast.success("Notification deleted");
		} catch {
			toast.error("Failed to delete notification");
		}
	};

	const handleClearAll = async () => {
		try {
			await clearAll();
			toast.success("All notifications cleared");
			setIsOpen(false);
		} catch {
			toast.error("Failed to clear notifications");
		}
	};

	const getNotificationIcon = (type: string) => {
		switch (type) {
			case "episode_ready":
				return <Podcast className="w-5 h-5" color="#89D7AF" />;
			case "weekly_reminder":
				return <Calendar className="w-5 h-5" color="#FFD700" />;
			default:
				return "📢";
		}
	};

	const getNotificationColor = (type: string) => {
		switch (type) {
			case "episode_ready":
				return "text-green-500";
			case "weekly_reminder":
				return "text-amber-500";
			default:
				return "text-gray-500";
		}
	};

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="icon" size="sm" className="relative" aria-label={`Notifications (${unreadCount} unread)`}>
					<Bell size={40} width={40} className="rounded-[9999999px] text-white/80 w-4 h-4" />
					{unreadCount > 0 && (<span className="absolute top-1 right-2 bg-destructive-foreground p-1 h-3 w-3 rounded-full text-[0.9rem]  flex items-center animate-pulse justify-center text-destructive-foreground">2</span>)}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent className="w-[400px] max-h-[500px]  z-1000" align="end" sideOffset={8}>
				<div className="flex justify-between items-center p-4 border-b  border-[#08E1F594]/50">
					<Typography variant="h3" className="text-lg font-semibold m-0">
						Notifications
					</Typography>
					{notifications.length > 0 && (
						<div className="flex gap-4">
							{unreadCount > 0 && (
								<Button variant="ghost" size="xs" onClick={handleMarkAllAsRead} disabled={isLoading} className="text-xs px-2 py-1 h-auto text-foreground opacity-50">
									<Check size={14} />
									Mark all
								</Button>
							)}
							<Button variant="outline" size="xs" onClick={handleClearAll} className="text-xs px-2 py-1 h-auto text-foreground/80 ">
								<Trash2 size={14} />
								Clear all
							</Button>
						</div>
					)}
				</div>

				<div className="max-h-96 overflow-y-auto p-2">
					{notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
							<Bell size={32} className="mb-3" />
							<p className="mb-1 text-base font-medium text-foreground">No notifications yet</p>
							<small className="text-xs text-foreground">We'll notify you when new episodes are ready</small>
						</div>
					) : (
						notifications.slice(0, 10).map(notification => (
							<Card
								variant="default"
								key={notification.notification_id}
								className={cn("bg-card mb-1 border transition-all duration-200 hover:border-primary/20 hover:shadow-sm", !notification.is_read && "border-2")}>
								<div className="py-1">
									<div className="flex items-start justify-between mb-1">
										<div className="flex items-center gap-2 ml-auto">
											<div className={cn("text-base mr-2", getNotificationColor(notification.type))}>{getNotificationIcon(notification.type)}</div>
											<time className="text-xs text-foreground/80 font-normal leadinng-[1.3rem]">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</time>
											{!notification.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
										</div>
									</div>

									<p className=" text-sm font-bold text-foreground leading-[1.5] my-4 text-right">{notification.message}</p>

									<div className="flex gap-4 items-center justify-end">
										{!notification.is_read && (
											<Button variant="outline" size="xs" onClick={() => handleMarkAsRead(notification.notification_id)} disabled={isLoading} className="border text-sm h-9">
												Mark as read
												<CheckCircle2Icon size={30} />
											</Button>
										)}
										<Button variant="outline" size="sm" onClick={() => handleDeleteNotification(notification.notification_id)} disabled={isLoading}>
											clear
											<X size={24} />
										</Button>
									</div>
								</div>
							</Card>
						))
					)}

					{notifications.length > 10 && (
						<div className="p-3 text-center border-t border-border">
							<Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
								View all notifications ({notifications.length})
							</Button>
						</div>
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
