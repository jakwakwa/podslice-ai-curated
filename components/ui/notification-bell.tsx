"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	Bell,
	Calendar,
	CheckCircle,
	CreditCard,
	EyeIcon,
	Podcast,
	TrendingDown,
	TrendingUp,
	XCircle,
	XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Typography } from "./typography";

export function NotificationBell() {
	const [isOpen, setIsOpen] = useState(false);
	const { notifications, unreadCount, isLoading, mutate } = useNotifications();

	const handleMarkAsRead = async (notificationId: string) => {
		try {
			const response = await fetch(`/api/notifications/${notificationId}/read`, {
				method: "PATCH",
			});
			if (!response.ok) throw new Error("Failed to mark as read");

			// Optimistically update the UI
			await mutate();
		} catch {
			toast.error("Failed to mark notification as read");
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			const unread = notifications.filter(n => !n.is_read);
			await Promise.all(
				unread.map(notif =>
					fetch(`/api/notifications/${notif.notification_id}/read`, { method: "PATCH" })
				)
			);
			await mutate();
			toast.success("All notifications marked as read");
		} catch {
			toast.error("Failed to mark all as read");
		}
	};

	const handleDeleteNotification = async (notificationId: string) => {
		try {
			const response = await fetch(`/api/notifications/${notificationId}`, {
				method: "DELETE",
			});
			if (!response.ok) throw new Error("Failed to delete");

			await mutate();
			toast.success("Notification deleted");
		} catch {
			toast.error("Failed to delete notification");
		}
	};

	const handleClearAll = async () => {
		try {
			await Promise.all(
				notifications.map(notif =>
					fetch(`/api/notifications/${notif.notification_id}`, { method: "DELETE" })
				)
			);
			await mutate();
			toast.success("All notifications cleared");
			setIsOpen(false);
		} catch {
			toast.error("Failed to clear notifications");
		}
	};

	const getNotificationIcon = (type: string) => {
		switch (type) {
			case "episode_ready":
				return <Podcast className="w-4 h-4" color="#89D7AF" />;
			case "weekly_reminder":
				return <Calendar className="w-4 h-4" color="#FFD700" />;
			case "subscription_activated":
				return <CheckCircle className="w-4 h-4" color="#10B981" />;
			case "subscription_renewed":
				return <CheckCircle className="w-4 h-4" color="#10B981" />;
			case "subscription_cancelled":
				return <XCircle className="w-4 h-4" color="#EF4444" />;
			case "subscription_ending":
				return <AlertTriangle className="w-4 h-4" color="#F59E0B" />;
			case "payment_failed":
				return <CreditCard className="w-4 h-4" color="#EF4444" />;
			case "payment_successful":
				return <CreditCard className="w-4 h-4" color="#10B981" />;
			case "subscription_upgraded":
				return <TrendingUp className="w-4 h-4" color="#3B82F6" />;
			case "subscription_downgraded":
				return <TrendingDown className="w-4 h-4" color="#6B7280" />;
			default:
				return <Bell className="w-4 h-4" color="#9CA3AF" />;
		}
	};

	const getNotificationColor = (type: string) => {
		switch (type) {
			case "episode_ready":
				return "text-green-500";
			case "weekly_reminder":
				return "text-amber-500";
			case "subscription_activated":
			case "subscription_renewed":
			case "payment_successful":
				return "text-green-500";
			case "subscription_cancelled":
			case "payment_failed":
				return "text-red-500";
			case "subscription_ending":
				return "text-amber-500";
			case "subscription_upgraded":
				return "text-blue-500";
			case "subscription_downgraded":
				return "text-gray-500";
			default:
				return "text-gray-500";
		}
	};

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="icon"
					size="sm"
					className="relative"
					aria-label={`Notifications (${unreadCount} unread)`}>
					<Bell
						size={40}
						width={40}
						className="rounded-[9999999px] text-white/80 w-4 h-4"
					/>
					{unreadCount > 0 && (
						<span className="absolute top-1 right-2 bg-destructive-foreground p-1 h-3 w-3 rounded-full text-[0.9rem]  flex items-center animate-pulse justify-center text-destructive-foreground">
							{unreadCount}
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				className="w-[400px] max-h-[500px] top-12  z-[9999999999999]"
				align="center"
				sideOffset={2}>
				<div className="flex justify-between items-center p-4 border-b  border-border">
					<Typography variant="h3" className="text-lg font-semibold m-0">
						Notifications
					</Typography>
					{notifications.length > 0 && (
						<div className="flex gap-4">
							{unreadCount > 0 && (
								<Button
									variant="ghost"
									size="xs"
									onClick={handleMarkAllAsRead}
									disabled={isLoading}
									className="text-xs px-2 py-1 h-auto text-white">
									<EyeIcon size={14} />
									Mark all
								</Button>
							)}
							<Button
								variant="outline"
								size="xs"
								onClick={handleClearAll}
								className="text-xs px-2 py-1 h-auto text-primary-foreground ">
								<XCircleIcon size={14} />
								Clear all
							</Button>
						</div>
					)}
				</div>

				<div className="max-h-96 overflow-y-auto p-2">
					{notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
							<Bell size={32} className="mb-3 text-primary-foreground-muted/40" />
							<p className="mb-1 text-base font-medium text-primary-foreground-muted/70">
								No notifications yet
							</p>
							<small className="text-xs text-primary-foreground-muted/70">
								We'll notify you when new episodes are ready
							</small>
						</div>
					) : (
						notifications.slice(0, 10).map(notification => (
							<Card
								variant="default"
								key={notification.notification_id}
								className={cn(
									"bg-indigo-200/20 border transition-all duration-200 rounded-2xl hover:border-cyan-400/30 hover:shadow-sm mb-2 py-1",
									!notification.is_read && "bg-cyan-300/20 border-3 border-cyan-300/20"
								)}>
								<div className="py-1">
									<div className="flex items-start justify-between mb-1">
										<div className="flex items-center gap-0 ml-auto">
											<div
												className={cn(
													"text-base mr-2",
													getNotificationColor(notification.type)
												)}>
												{getNotificationIcon(notification.type)}
											</div>
											<time className="text-[0.7rem] text-foreground/80 font-normal leadinng-[1.3rem]">
												{formatDistanceToNow(new Date(notification.created_at), {
													addSuffix: true,
												})}
											</time>
											{!notification.is_read && (
												<div className="w-2 h-2 ml-3 rounded-full bg-azure-400" />
											)}
										</div>
									</div>

									<p className=" text-sm font-medium text-shadow-gray-700/70  text-shadow-sm text-foreground leading-[1.5] my-4 text-right">
										{notification.message}
									</p>

									<div className="flex gap-4 items-center justify-end">
										{!notification.is_read && (
											<Button
												variant="ghost"
												size="xs"
												onClick={() => handleMarkAsRead(notification.notification_id)}
												disabled={isLoading}
												className="border  shadow-black/30 shadow-md  rounded-4xl text-blue-300 text-xs py-0 h-6 px-3">
												mark as read
												<EyeIcon size={14} />
											</Button>
										)}
										<Button
											variant="ghost"
											size="xs"
											onClick={() =>
												handleDeleteNotification(notification.notification_id)
											}
											className="border  shadow-black/30 shadow-md  rounded-4xl text-xs text-pink-200  h-6 px-3"
											disabled={isLoading}>
											clear
											<XCircleIcon size={2} className="w-2 h-2" />
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
