"use client";

import { useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { PRICING_TIER } from "@/config/paddle-config";
import { useSubscription } from "@/hooks/use-subscription";
import type { PaddleCheckoutCompletedData } from "@/lib/types";
import { PricingPlans } from "../_components/pricing-plans";
import { Subscriptions } from "../_components/subscriptions/subscriptions";

const ManagPlanLandingPage: React.FC = () => {
	const { subscription, mutate } = useSubscription();
	const [isSyncing, setIsSyncing] = useState(false);

	// Sync with Paddle on mount
	useEffect(() => {
		const run = async () => {
			try {
				await fetch("/api/account/subscription/sync-paddle", { method: "POST" });
				await mutate(); // Revalidate after sync
			} catch (err) {
				console.error("Failed to sync with Paddle", err);
			}
		};
		void run();
	}, [mutate]);

	// Show expired dialog if redirected with expired=1 (authoritative from URL)
	const searchParams = useSearchParams();
	const showExpiredDialog = (searchParams?.get("expired") ?? "") === "1";
	const [expiredOpen, setExpiredOpen] = useState<boolean>(showExpiredDialog);
	useEffect(() => setExpiredOpen(showExpiredDialog), [showExpiredDialog]);

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
			// Revalidate subscription data
			await mutate();
		} catch (error) {
			console.error("Error syncing subscription:", error);
		} finally {
			setIsSyncing(false);
		}
	};

	const onCheckoutClosed = async () => {
		await mutate();
	};

	const status =
		subscription?.status && typeof subscription.status === "string"
			? subscription.status.toLowerCase()
			: null;
	const hasActiveSubscription = Boolean(
		subscription && (status === "active" || status === "trialing" || status === "paused")
	);

	return (
		<>
			<Dialog open={expiredOpen} onOpenChange={setExpiredOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Membership expired</DialogTitle>
						<DialogDescription>
							Your subscription is not active. To continue creating episodes, please
							upgrade your membership.
						</DialogDescription>
					</DialogHeader>
					<div className="flex gap-2 justify-end mt-4">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setExpiredOpen(false)}>
							Close
						</Button>
						<Button
							type="button"
							variant="default"
							onClick={() => {
								// Keep user on this page; pricing plans are below
								setExpiredOpen(false);
							}}>
							Upgrade now
						</Button>
					</div>
				</DialogContent>
			</Dialog>
			{hasActiveSubscription && (
				<div className=" mt-4 ">
					<Subscriptions onSubscriptionChange={mutate} />
				</div>
			)}

			{!hasActiveSubscription && (
				<div className="flex w-full flex-col gap-12 mt-4 ">
					<PricingPlans
						onCheckoutCompleted={syncSubscription}
						onCheckoutClosed={onCheckoutClosed}
						paddleProductPlan={PRICING_TIER}
					/>
				</div>
			)}
		</>
	);
};

export { ManagPlanLandingPage };
