"use client"

import { formatDistanceToNow } from "date-fns"
import { Bell, Calendar, Check, Clock, Podcast, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AppSpinner } from "@/components/ui/app-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function NotificationsPage() {
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const fetchNotifications = useCallback(async () => {
		try {
			const response = await fetch("/api/notifications")
			if (!response.ok) {
				throw new Error("Failed to fetch notifications")
			}
			const data = await response.json()
			setNotifications(data)
		} catch (error) {
			console.error("Error fetching notifications:", error)
			toast.error("Failed to load notifications")
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchNotifications()
	}, [fetchNotifications])


	const router = useRouter()
	const handleMarkAsRead = async (notificationId: string) => {
		try {
			const response = await fetch(`/api/notifications/${notificationId}/read`, {
				method: "PATCH",
			})
			if (!response.ok) {
				throw new Error("Failed to mark notification as read")
			}
			setNotifications(prev => prev.map(notif => (notif.notification_id === notificationId ? { ...notif, is_read: true } : notif)))
			toast.success("Notification marked as read")
		} catch (error) {
			console.error("Error marking notification as read:", error)
			toast.error("Failed to mark notification as read")
		}
	}

	const handleMarkAllAsRead = async () => {
		try {
			const unreadNotifications = notifications.filter(n => !n.is_read)
			await Promise.all(
				unreadNotifications.map(notif =>
					fetch(`/api/notifications/${notif.notification_id}/read`, {
						method: "PATCH",
					})
				)
			)
			setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
			toast.success("All notifications marked as read")
		} catch (error) {
			console.error("Error marking all notifications as read:", error)
			toast.error("Failed to mark all notifications as read")
		}
	}

	const handleDeleteNotification = async (notificationId: string) => {
		try {
			const response = await fetch(`/api/notifications/${notificationId}`, {
				method: "DELETE",
			})
			if (!response.ok) {
				throw new Error("Failed to delete notification")
			}
			setNotifications(prev => prev.filter(notif => notif.notification_id !== notificationId))
			toast.success("Notification deleted")
		} catch (error) {
			console.error("Error deleting notification:", error)
			toast.error("Failed to delete notification")
		}
	}

	const handleClearAll = async () => {
		try {
			await Promise.all(
				notifications.map(notif =>
					fetch(`/api/notifications/${notif.notification_id}`, {
						method: "DELETE",
					})
				)
			)
			setNotifications([])
			toast.success("All notifications cleared")
		} catch (error) {
			console.error("Error clearing all notifications:", error)
			toast.error("Failed to clear all notifications")
		}
	}

	const getNotificationIcon = (type: Notification["type"]) => {
		switch (type) {
			case "episode_ready":
				return <Podcast className="w-5 h-5" color="#89D7AF" />
			case "weekly_reminder":
				return <Calendar className="w-5 h-5" color="#FFD700" />
			case "subscription_expiring":
				return <Clock className="w-5 h-5" color="#FFA500" />
			case "trial_ending":
				return <Bell className="w-5 h-5" color="#FF0000" />
			default:
				return <Bell className="w-5 h-5" color="#000000" />
		}
	}

	const getNotificationColor = (type: string) => {
		switch (type) {
			case "episode_ready":
				return "text-green-500"
			case "weekly_reminder":
				return "text-amber-500"
			default:
				return "text-gray-500"
		}
	}

	const unreadCount = notifications.filter(n => !n.is_read).length

	if (isLoading) {
		return (
			<div className="max-w-4xl mx-auto p-8 min-h-screen">
				<div className="flex items-center justify-center min-h-[400px]">
					<AppSpinner size="lg" label="Loading notifications..." />
				</div>
			</div>
		)
	}

	return (
		<Card variant="glass" className="w-full lg:w-full lg:min-w-screen/[60%] lg:max-w-[1200px] h-auto mb-0 mt-4 px-2 pt-12">
			<div className="mb-8 flex flex-col  items-center justify-start">
				<div className="w-full flex items-center justify-between flex-wrap gap-4">
					<div className="flex flex-row gap-3 mt-6 h-14">
						<PageHeader title="Notifications" className="h-14 mb-0 mt-0" />
					</div>
					<div className="flex gap-2 flex-wrap">
						{unreadCount > 0 && (
							<Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="flex items-center gap-2 text-sm">
								<Check size={16} />
								Mark all as read
							</Button>
						)}
						{notifications.length > 0 && (
							<Button variant="default" size="sm" onClick={handleClearAll} className="flex items-center gap-2 text-sm">
								<Trash2 size={16} />
								Clear all
							</Button>
						)}
					</div>
				</div>
			</div>

			<div className="min-h-[400px] px-0 episode-card-wrapper-dark">
				{notifications.length === 0 ? (
					<Card variant={"episode"} className="text-center px-0 py-18 mt-8 border-2 border-dashed border-border bg-card content">
						<CardContent className="flex flex-col items-center gap-4">
							<Bell className="w-8 h-8 text-muted-foreground opacity-50" />
							<h3 className="text-xl font-semibold text-foreground m-0">No notifications</h3>
							<p className="text-muted-foreground max-w-md text-base m-0">You're all caught up! New notifications will appear here when they arrive.</p>
						</CardContent>
					</Card>
				) : (
					<div className="w-full flex flex-col gap-2 px-2 py-2">
						{notifications.slice(0, 10).map(notification => (
							<Card variant="default" className="py-1 bg-accent-dark" key={notification.notification_id}>
								<div className=" flex flex-col">
									<div className="flex items-start justify-between py-2 ">
										<time className="text-sm text-foreground/40">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</time>
										{!notification.is_read && <div className="w-2 h-2 rounded-full bg-secondary-light" />}
									</div>

									<div className="flex justify-start items-center gap-4 h-full py-2">
										<span className={cn("text-base mr-2", getNotificationColor(notification.type))}>{getNotificationIcon(notification.type)}</span>
										<p className="text-body font-medium leading-relaxed">{notification.message}</p>
									</div>

									<div className="flex gap-2 items-center justify-end">
										<Button variant="default" size="sm" className="text-xs px-2 " onClick={() => router.push("/my-episodes")}>
											My Episodes
										</Button>
										{!notification.is_read && (
											<Button variant="outline" size="sm" onClick={() => handleMarkAsRead(notification.notification_id)} disabled={isLoading} className="text-xs px-2 py-1 h-auto">
												<Check size={12} />
												Mark read
											</Button>
										)}
										<Button variant="destructive" size="sm" onClick={() => handleDeleteNotification(notification.notification_id)} disabled={isLoading} className="text-xs px-2 py-1 h-auto">
											<X size={12} />
											Delete
										</Button>
									</div>
								</div>
							</Card>
						))}
					</div>
				)}
			</div>
		</Card>
	)
}
