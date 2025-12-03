import useSWR from "swr";

export interface Notification {
	notification_id: string;
	user_id: string;
	type: string;
	message: string;
	is_read: boolean;
	created_at: string;
}

const fetcher = async (url: string): Promise<Notification[]> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch notifications: ${response.status}`);
	}
	return response.json();
};

export function useNotifications() {
	const { data, error, isLoading, mutate } = useSWR<Notification[]>(
		"/api/notifications",
		fetcher,
		{
			refreshInterval: 60000, // Poll every 60 seconds
			revalidateOnFocus: true, // Refresh when window gains focus
			revalidateOnReconnect: true, // Refresh when network reconnects
			dedupingInterval: 5000, // Prevent duplicate requests within 5s
			focusThrottleInterval: 10000, // Throttle focus revalidation to max once per 10s
		}
	);

	const notifications = data ?? [];
	const unreadCount = notifications.filter(n => !n.is_read).length;

	return {
		notifications,
		unreadCount,
		isLoading,
		error,
		mutate, // Expose for manual revalidation
	};
}
