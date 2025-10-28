"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Notification } from "@/lib/types";
import NotificationsToolbar from "@/components/notifications/notifications-toolbar";
import NotificationList from "@/components/notifications/notification-list";
import NotificationsEmptyState from "@/components/notifications/empty-state";
import { Card } from "@/components/ui/card";

interface NotificationsClientProps {
  initialNotifications: Notification[];
  content: {
    title: string;
    description: string;
    toolbar: { markAllAsRead: string; clearAll: string };
    empty: { title: string; description: string };
  };
}

export default function NotificationsClient({ initialNotifications, content }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isMutating, setIsMutating] = useState(false);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      setIsMutating(true);
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
      if (!response.ok) throw new Error("Failed to mark notification as read");
      setNotifications((prev) => prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n)));
      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    } finally {
      setIsMutating(false);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      setIsMutating(true);
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(
        unread.map((notif) => fetch(`/api/notifications/${notif.notification_id}/read`, { method: "PATCH" }))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    } finally {
      setIsMutating(false);
    }
  }, [notifications]);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      setIsMutating(true);
      const response = await fetch(`/api/notifications/${notificationId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete notification");
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    } finally {
      setIsMutating(false);
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    try {
      setIsMutating(true);
      await Promise.all(
        notifications.map((notif) => fetch(`/api/notifications/${notif.notification_id}`, { method: "DELETE" }))
      );
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      toast.error("Failed to clear all notifications");
    } finally {
      setIsMutating(false);
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Card className="w-full lg:w-full lg:min-w-screen/[60%] h-auto mb-0 px-2">
      <div className="mb-8 mt-4 flex flex-col items-center justify-start">
        <div className="w-full flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1" />
          <NotificationsToolbar
            unreadCount={unreadCount}
            totalCount={notifications.length}
            onMarkAllAsRead={handleMarkAllAsRead}
            onClearAll={handleClearAll}
            content={content.toolbar}
          />
        </div>
      </div>

      <div className="min-h-[400px] px-0 episode-card-wrapper-dark">
        {notifications.length === 0 ? (
          <NotificationsEmptyState
            title={content.empty.title}
            description={content.empty.description}
          />
        ) : (
          <NotificationList
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDeleteNotification}
            isMutating={isMutating}
          />
        )}
      </div>
    </Card>
  );
}
