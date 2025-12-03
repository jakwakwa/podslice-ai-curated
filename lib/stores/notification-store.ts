import { toast } from "sonner";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface NotificationPreferences {
	emailNotifications: boolean;
	inAppNotifications: boolean;
	updatedAt: Date;
}

export interface Notification {
	notification_id: string;
	user_id: string;
	type: string;
	message: string;
	is_read: boolean;
	created_at: string;
}

export interface NotificationStore {
	// State
	preferences: NotificationPreferences | null;
	notifications: Notification[];
	unreadCount: number;
	isLoading: boolean;
	error: string | null;
	isPolling: boolean;
	pollInterval: number;
	pollIntervalId: NodeJS.Timeout | null;
	pausedUntilSubmission: boolean;
	locallyReadIds: Set<string>;

	// Actions for preferences
	loadPreferences: () => Promise<void>;
	updatePreferences: (preferences: {
		emailNotifications: boolean;
		inAppNotifications: boolean;
	}) => Promise<{ success: boolean } | { error: string }>;
	toggleEmailNotifications: () => Promise<{ success: boolean } | { error: string }>;
	toggleInAppNotifications: () => Promise<{ success: boolean } | { error: string }>;

	// Actions for notifications
	loadNotifications: (silent?: boolean) => Promise<void>;
	markAsRead: (notificationId: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	deleteNotification: (notificationId: string) => Promise<void>;
	clearAll: () => Promise<void>;

	// Polling actions
	startPolling: (interval?: number) => void;
	stopPolling: () => void;
	restartPolling: (interval?: number) => void;
	resumeAfterSubmission: () => void;

	// Utility actions
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	reset: () => void;
}

const initialState = {
	preferences: null,
	notifications: [],
	unreadCount: 0,
	isLoading: false,
	error: null,
	isPolling: false,
	pollInterval: 30000, // 30 seconds default
	pollIntervalId: null,
	pausedUntilSubmission: false,
	locallyReadIds: new Set<string>(),
};

export const useNotificationStore = create<NotificationStore>()(
	devtools(
		(set, get) => ({
			...initialState,

			// Actions for preferences
			loadPreferences: async () => {
				set({ isLoading: true, error: null });

				try {
					// Fetch fresh preferences
					const response = await fetch("/api/account/notifications");

					if (!response.ok) {
						throw new Error(`Failed to load preferences: ${response.status}`);
					}

					const preferences = await response.json();

					set({
						preferences,
						isLoading: false,
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error";
					set({
						error: message,
						isLoading: false,
					});
					console.error("Failed to load preferences:", error);
				}
			},

			updatePreferences: async (newPreferences: {
				emailNotifications: boolean;
				inAppNotifications: boolean;
			}) => {
				set({ isLoading: true, error: null });

				try {
					// Call API to update preferences
					const response = await fetch("/api/account/notifications", {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(newPreferences),
					});

					if (!response.ok) {
						throw new Error(`Failed to update preferences: ${response.status}`);
					}

					const updatedPreferences = await response.json();

					set({
						preferences: updatedPreferences,
						isLoading: false,
					});

					toast.success("Notification preferences updated successfully!");
					return { success: true };
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error";
					set({
						error: message,
						isLoading: false,
					});
					console.error("Failed to update preferences:", error);
					toast.error("Failed to update notification preferences");
					return { error: message };
				}
			},

			toggleEmailNotifications: async () => {
				const currentPreferences = get().preferences;
				if (!currentPreferences) {
					return { error: "No preferences loaded" };
				}

				return await get().updatePreferences({
					emailNotifications: !currentPreferences.emailNotifications,
					inAppNotifications: currentPreferences.inAppNotifications,
				});
			},

			toggleInAppNotifications: async () => {
				const currentPreferences = get().preferences;
				if (!currentPreferences) {
					return { error: "No preferences loaded" };
				}

				return await get().updatePreferences({
					emailNotifications: currentPreferences.emailNotifications,
					inAppNotifications: !currentPreferences.inAppNotifications,
				});
			},

			// Actions for notifications
			loadNotifications: async (silent = false) => {
				if (!silent) {
					set({ isLoading: true, error: null });
				}

				try {
					// Fetch fresh notifications
					const response = await fetch("/api/notifications");

					if (!response.ok) {
						const errorText = await response.text();
						console.error(
							`[NOTIFICATION_LOAD_ERROR] Status: ${response.status}, Response: ${errorText}`
						);
						throw new Error(`Failed to load notifications: ${response.status}`);
					}

					const fetched: Notification[] = await response.json();
					const { locallyReadIds } = get();
					// Ensure locally marked-as-read stay read even if server cache is stale
					const normalized = fetched.map(n =>
						locallyReadIds.has(n.notification_id) ? { ...n, is_read: true } : n
					);
					const unreadCount = normalized.filter(n => !n.is_read).length;
					set({ notifications: normalized, unreadCount, isLoading: false });
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error";
					set({
						error: message,
						isLoading: false,
					});
					console.error("Failed to load notifications:", error);
				}
			},

			markAsRead: async (notificationId: string) => {
				try {
					const response = await fetch(`/api/notifications/${notificationId}/read`, {
						method: "PATCH",
					});

					if (!response.ok) {
						throw new Error(`Failed to mark notification as read: ${response.status}`);
					}

					// Update local state and pause polling until next submission
					const { notifications, locallyReadIds } = get();
					const nextLocallyRead = new Set(locallyReadIds);
					nextLocallyRead.add(notificationId);
					const updatedNotifications = notifications.map((notification: Notification) =>
						notification.notification_id === notificationId
							? { ...notification, is_read: true }
							: notification
					);
					const unreadCount = updatedNotifications.filter(
						(n: Notification) => !n.is_read
					).length;
					set({
						notifications: updatedNotifications,
						unreadCount,
						locallyReadIds: nextLocallyRead,
						pausedUntilSubmission: true,
					});
					get().stopPolling();
				} catch (error) {
					const _message = error instanceof Error ? error.message : "Unknown error";
					console.error("Failed to mark notification as read:", error);
					toast.error("Failed to mark notification as read");
				}
			},

			markAllAsRead: async () => {
				try {
					const response = await fetch("/api/notifications", {
						method: "DELETE",
					});

					if (!response.ok) {
						throw new Error(
							`Failed to mark all notifications as read: ${response.status}`
						);
					}

					// Update local state and pause polling until next submission
					const { notifications, locallyReadIds } = get();
					const nextLocallyRead = new Set(locallyReadIds);
					for (const n of notifications) nextLocallyRead.add(n.notification_id);
					const updatedNotifications = notifications.map(
						(notification: Notification) => ({ ...notification, is_read: true })
					);
					set({
						notifications: updatedNotifications,
						unreadCount: 0,
						locallyReadIds: nextLocallyRead,
						pausedUntilSubmission: true,
					});
					get().stopPolling();
					toast.success("All notifications marked as read");
				} catch (error) {
					const _message = error instanceof Error ? error.message : "Unknown error";
					console.error("Failed to mark all notifications as read:", error);
					toast.error("Failed to mark all notifications as read");
				}
			},

			deleteNotification: async (notificationId: string) => {
				try {
					const response = await fetch(`/api/notifications/${notificationId}`, {
						method: "DELETE",
					});

					if (!response.ok) {
						throw new Error(`Failed to delete notification: ${response.status}`);
					}

					// Update local state
					const { notifications } = get();
					const updatedNotifications = notifications.filter(
						(notification: Notification) =>
							notification.notification_id !== notificationId
					);

					const unreadCount = updatedNotifications.filter(
						(notification: Notification) => !notification.is_read
					).length;

					set({
						notifications: updatedNotifications,
						unreadCount,
					});

					toast.success("Notification deleted");
				} catch (error) {
					const _message = error instanceof Error ? error.message : "Unknown error";
					console.error("Failed to delete notification:", error);
					toast.error("Failed to delete notification");
				}
			},

			clearAll: async () => {
				try {
					const response = await fetch("/api/notifications", {
						method: "DELETE",
					});

					if (!response.ok) {
						throw new Error(`Failed to clear all notifications: ${response.status}`);
					}

					set({
						notifications: [],
						unreadCount: 0,
					});

					toast.success("All notifications cleared");
				} catch (error) {
					const _message = error instanceof Error ? error.message : "Unknown error";
					console.error("Failed to clear all notifications:", error);
					toast.error("Failed to clear all notifications");
				}
			},

			// Polling actions
			startPolling: (interval?: number) => {
				const { isPolling } = get();
				const { pausedUntilSubmission } = get();
				if (isPolling || pausedUntilSubmission) return;

				const pollInterval = interval ?? get().pollInterval;
				set({ isPolling: true, pollInterval });

				// Load notifications immediately (not silent for initial load)
				get().loadNotifications();

				// Set up polling interval
				const intervalId = setInterval(async () => {
					const { isPolling: stillPolling } = get();
					if (stillPolling) {
						// Use silent mode for polling to avoid UI loading states
						// console.log("[NOTIFICATION_POLLING] Polling for new notifications...");
						try {
							const response = await fetch("/api/notifications");
							if (response.status === 401) {
								console.warn(
									"[NOTIFICATION_POLLING] Authentication failed, stopping polling"
								);
								get().stopPolling();
								return;
							}
							// If we get here, the request was successful, so call the normal loadNotifications
							await get().loadNotifications(true);
						} catch (error) {
							console.error("[NOTIFICATION_POLLING] Polling error:", error);
						}
					}
				}, pollInterval);

				// Store interval ID for cleanup
				set({ pollIntervalId: intervalId });
			},

			stopPolling: () => {
				const { isPolling, pollIntervalId } = get();
				if (!isPolling) return;

				set({ isPolling: false });

				// Clear the polling interval
				if (pollIntervalId) {
					clearInterval(pollIntervalId);
					set({ pollIntervalId: null });
				}
			},

			restartPolling: (interval?: number) => {
				const { isPolling } = get();
				if (isPolling) {
					get().stopPolling();
				}
				// Small delay to ensure cleanup is complete
				setTimeout(() => {
					get().startPolling(interval);
				}, 100);
			},

			resumeAfterSubmission: () => {
				set({ pausedUntilSubmission: false });
				get().startPolling();
			},

			// Utility actions
			setLoading: (loading: boolean) => {
				set({ isLoading: loading });
			},

			setError: (error: string | null) => {
				set({ error });
			},

			reset: () => {
				set(initialState);
			},
		}),
		{
			name: "notification-store",
			enabled: process.env.NODE_ENV === "development",
		}
	)
);
