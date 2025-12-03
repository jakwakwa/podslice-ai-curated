import { useEffect } from "react";
import { z } from "zod";
import type { PaddleSubscription } from "@/lib/stores/subscription-store-paddlejs";
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
				let rawJson: unknown = null;
				try {
					rawJson = await response.json();
				} catch (_e) {
					// If body is empty or not JSON, treat as no subscription
					rawJson = null;
				}

				if (rawJson == null) {
					setSubscription(null);
					return;
				}

				// Validate and normalize into PaddleSubscription shape
				const SubscriptionResponseSchema = z.object({
					subscription_id: z.string(),
					user_id: z.string(),
					paddle_subscription_id: z.string().nullable(),
					paddle_price_id: z.string().nullable(),
					plan_type: z.string(),
					status: z.string(),
					current_period_start: z.string().nullable().optional(),
					current_period_end: z.string().nullable().optional(),
					trial_start: z.string().nullable().optional(),
					trial_end: z.string().nullable().optional(),
					canceled_at: z.string().nullable().optional(),
					cancel_at_period_end: z.boolean(),
					created_at: z.string(),
					updated_at: z.string(),
				});

				const parsed = SubscriptionResponseSchema.safeParse(rawJson);
				if (!parsed.success) {
					setSubscription(null);
					return;
				}

				const d = parsed.data;
				const allowedPlanTypes = [
					"free_slice",
					"casual_listener",
					"curate_control",
				] as const;
				type PlanType = (typeof allowedPlanTypes)[number];
				const isPlanType = (value: string): value is PlanType =>
					(allowedPlanTypes as readonly string[]).includes(value);
				const normalizedPlan: PlanType = isPlanType(d.plan_type)
					? d.plan_type
					: "casual_listener";

				const allowedStatuses = ["trialing", "active", "canceled", "paused"] as const;
				type StatusType = (typeof allowedStatuses)[number];
				const isStatusType = (value: string): value is StatusType =>
					(allowedStatuses as readonly string[]).includes(value);
				const normalizedStatus: StatusType = isStatusType(d.status) ? d.status : "active";

				const normalizeDate = (value?: string | null): Date | null =>
					value ? new Date(value) : null;

				const normalized: PaddleSubscription = {
					subscription_id: d.subscription_id,
					user_id: d.user_id,
					paddle_subscription_id: d.paddle_subscription_id,
					paddle_price_id: d.paddle_price_id,
					plan_type: normalizedPlan,
					status: normalizedStatus,
					current_period_start: normalizeDate(d.current_period_start ?? null),
					current_period_end: normalizeDate(d.current_period_end ?? null),
					trial_start: normalizeDate(d.trial_start ?? null),
					trial_end: normalizeDate(d.trial_end ?? null),
					canceled_at: normalizeDate(d.canceled_at ?? null),
					cancel_at_period_end: Boolean(d.cancel_at_period_end),
					created_at: new Date(d.created_at),
					updated_at: new Date(d.updated_at),
				};

				setSubscription(normalized);
			} catch (error) {
				// Only log actual errors, not the absence of subscription
				if (
					error instanceof Error &&
					!error.message.includes("204") &&
					!error.message.includes("Unexpected end of JSON input")
				) {
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
