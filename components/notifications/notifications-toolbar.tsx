"use client";

import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationsToolbarProps {
  unreadCount: number;
  totalCount: number;
  onMarkAllAsRead: () => void | Promise<void>;
  onClearAll: () => void | Promise<void>;
  content: {
    markAllAsRead: string;
    clearAll: string;
  };
}

export default function NotificationsToolbar({
  unreadCount,
  totalCount,
  onMarkAllAsRead,
  onClearAll,
  content,
}: NotificationsToolbarProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="xs"
          onClick={onMarkAllAsRead}
          className="flex items-center gap-2 text-sm"
        >
          <Check size={16} />
          {content.markAllAsRead}
        </Button>
      )}
      {totalCount > 0 && (
        <Button
          variant="default"
          size="xs"
          onClick={onClearAll}
          className="flex items-center gap-2 text-sm"
        >
          <Trash2 size={16} />
          {content.clearAll}
        </Button>
      )}
    </div>
  );
}
