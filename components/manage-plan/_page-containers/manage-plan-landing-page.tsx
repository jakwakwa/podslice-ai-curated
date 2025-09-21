"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { PRICING_TIER } from "@/config/paddle-config";
import { useSubscriptionStore } from "@/lib/stores/subscription-store-paddlejs";
import type { PaddleCheckoutCompletedData } from "@/lib/types";
import { PricingPlans } from "../_components/pricing-plans";
import { Subscriptions } from "../_components/subscriptions/subscriptions";

const ManagPlanLandingPage: React.FC = () => {
	const setSubscription = useSubscriptionStore(state => state.setSubscription);
	const subscription = useSubscriptionStore(state => state.subscription);
	const [isSyncing, setIsSyncing] = useState(false);

	const fetchSubscription = useCallback(async () => {
		try {
			const res = await fetch("/api/account/subscription", { cache: "no-store" });
			if (!res.ok) return;

			// Handle 204 No Content case (no subscription found)
			if (res.status === 204) {
				setSubscription(null);
				return;
			}

			const data = await res.json();
			setSubscription(data);
		} catch (err) {
			console.error("Failed to fetch subscription", err);
		}
	}, [setSubscription]);

	useEffect(() => {
		const run = async () => {
			try {
				await fetch("/api/account/subscription/sync-paddle", { method: "POST" });
			} catch { }
			await fetchSubscription();
		};
		void run();
	}, [fetchSubscription]);

	const syncSubscription = async (data: PaddleCheckoutCompletedData) => {
		if (isSyncing) return;
		setIsSyncing(true);
		try {
			const res = await fetch("/api/account/subscription", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to sync subscription");
			}
			// Refetch subscription to update the store and UI
			await fetchSubscription();
		} catch (error) {
			console.error("Error syncing subscription:", error);
		} finally {
			setIsSyncing(false);
		}
	};

	const status = subscription?.status && typeof subscription.status === "string" ? subscription.status.toLowerCase() : null;
	const hasActiveSubscription = Boolean(subscription && (status === "active" || status === "trialing" || status === "paused"));

	return (
		<>
			{hasActiveSubscription && <div className="">
				<Subscriptions />
			</div>}

			{!hasActiveSubscription && (
				<div className="flex w-full flex-col gap-12 ">
					<PricingPlans onCheckoutCompleted={syncSubscription} onCheckoutClosed={fetchSubscription} paddleProductPlan={PRICING_TIER} />
				</div>
			)}
		</>
	);
};

export { ManagPlanLandingPage };
