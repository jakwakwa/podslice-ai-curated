import useSWR from "swr";

export interface Subscription {
	subscription_id: string;
	user_id: string;
	paddle_subscription_id: string | null;
	paddle_price_id: string | null;
	plan_type: string;
	status: string;
	current_period_start: string | null;
	current_period_end: string | null;
	trial_start: string | null;
	trial_end: string | null;
	canceled_at: string | null;
	cancel_at_period_end: boolean;
	created_at: string;
	updated_at: string;
}

const fetcher = async (url: string): Promise<Subscription | null> => {
	const response = await fetch(url, { cache: "no-store" });

	// Handle 204 No Content case (no subscription found)
	if (response.status === 204) {
		return null;
	}

	if (!response.ok) {
		throw new Error(`Failed to fetch subscription: ${response.status}`);
	}

	return response.json();
};

export function useSubscription() {
	const { data, error, isLoading, mutate } = useSWR<Subscription | null>(
		"/api/account/subscription",
		fetcher,
		{
			refreshInterval: 0, // Don't auto-refresh by default
			revalidateOnFocus: true, // Refresh when window gains focus
			revalidateOnReconnect: true, // Refresh when network reconnects
			dedupingInterval: 5000, // Prevent duplicate requests within 5s
		}
	);

	return {
		subscription: data,
		isLoading,
		error,
		mutate, // Expose for manual revalidation after actions
	};
}
