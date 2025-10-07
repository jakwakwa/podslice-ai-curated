import { useEffect } from "react";
import { useSubscriptionStore } from "@/lib/stores/subscription-store-paddlejs";

/**
 * Hook to initialize subscription data on app load
 * This ensures subscription data is available consistently across components
 */
export function useSubscriptionInit() {
	const { setSubscription, setIsLoading, setError } = useSubscriptionStore();

	useEffect(() => {
		const initializeSubscription = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch("/api/account/subscription", {
					cache: "no-store",
				});

				if (!response.ok) {
					if (response.status === 204) {
						// No subscription found - this is a valid state, not an error
						setSubscription(null);
						return;
					} else {
						throw new Error(`Failed to fetch subscription: ${response.status}`);
					}
				}

				// Handle 204 No Content response
				if (response.status === 204) {
					setSubscription(null);
					return;
				}

				// Parse JSON safely without relying on content-length; treat empty body as no subscription
				let subscription: unknown = null;
				try {
					subscription = await response.json();
				} catch (_e) {
					// If body is empty or not JSON, treat as no subscription
					subscription = null;
				}
				setSubscription(subscription);
			} catch (error) {
				// Only log actual errors, not the absence of subscription
				if (error instanceof Error && !error.message.includes("204") && !error.message.includes("Unexpected end of JSON input")) {
					console.error("Failed to initialize subscription:", error);
				}
				setError(error instanceof Error ? error.message : "Failed to load subscription");
			} finally {
				setIsLoading(false);
			}
		};

		initializeSubscription();
	}, [setSubscription, setIsLoading, setError]);
}
