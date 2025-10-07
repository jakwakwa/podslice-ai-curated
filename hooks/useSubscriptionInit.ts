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

				// Check if response has content before trying to parse JSON
				const contentLength = response.headers.get("content-length");
				const contentType = response.headers.get("content-type");

				if (contentLength === "0" || contentLength === null || !contentType?.includes("application/json")) {
					setSubscription(null);
					return;
				}

				const subscription = await response.json();
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
