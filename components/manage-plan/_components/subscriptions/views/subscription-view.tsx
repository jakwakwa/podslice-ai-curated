"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRICING_TIER } from "@/config/paddle-config";
import { useSubscriptionStore } from "@/lib/stores/subscription-store-paddlejs";

export function SubscriptionView() {
	const { subscription, setSubscription } = useSubscriptionStore(
		useShallow(state => ({
			subscription: state.subscription,
			setSubscription: state.setSubscription,
		}))
	);
	const [_isSubmitting, _setIsSubmitting] = useState(false);
	const [_isSyncing, setIsSyncing] = useState(false);
	// Removed swap/cancel and manual force-sync local states

	useEffect(() => {
		const fetchSubscription = async () => {
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
			} catch {}
		};
		fetchSubscription();
	}, [setSubscription]);

	const _syncMembership = async () => {
		setIsSyncing(true);
		try {
			// First try to sync with Paddle
			const syncRes = await fetch("/api/account/subscription/sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			if (syncRes.ok) {
				const _syncData = await syncRes.json();
			} else {
				const _syncError = await syncRes.json();
			}

			// Then fetch the updated subscription data
			const res = await fetch("/api/account/subscription", { cache: "no-store" });
			if (!res.ok) {
				console.error(
					"Failed to fetch subscription after sync:",
					res.status,
					res.statusText
				);
				return;
			}

			// Handle 204 No Content case (no subscription found)
			if (res.status === 204) {
				setSubscription(null);
				return;
			}

			const data = await res.json();
			setSubscription(data);
		} catch (error) {
			console.error("Failed to sync membership:", error);
		} finally {
			setIsSyncing(false);
		}
	};

	// Removed manual force sync; we trigger one sync automatically when portal polling starts

	const currentPlan = PRICING_TIER.find(p => p.priceId === subscription?.paddle_price_id);

	// Format helpers for display-only dates
	const formatDateTime = (value: unknown): string => {
		if (!value) return "—";
		const date =
			typeof value === "string" || typeof value === "number"
				? new Date(value)
				: (value as Date);
		if (Number.isNaN(date.getTime())) return "—";
		return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
	};

	const refreshSubscription = useCallback(async (): Promise<void> => {
		try {
			const res = await fetch("/api/account/subscription", { cache: "no-store" });
			if (!res.ok) return;
			if (res.status === 204) {
				setSubscription(null);
				return;
			}
			const data = await res.json();
			setSubscription(data);
		} catch {}
	}, [setSubscription]);

	const pollingTimerRef = useRef<number | null>(null);
	const pollingUntilRef = useRef<number | null>(null);
	const initialSnapshotRef = useRef<{
		priceId: string | null;
		status: string | null;
		cancelAtPeriodEnd: boolean;
	} | null>(null);
	const syncTriggeredRef = useRef<boolean>(false);
	const lastSyncAtRef = useRef<number>(0);
	const pollingStopTimerRef = useRef<number | null>(null);
	const [isPolling, setIsPolling] = useState(false);

	const stopPortalPolling = useCallback(() => {
		if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
		if (pollingStopTimerRef.current) clearTimeout(pollingStopTimerRef.current);
		pollingTimerRef.current = null;
		pollingStopTimerRef.current = null;
		pollingUntilRef.current = null;
		setIsPolling(false);
	}, []);

	const takeSnapshot = (): {
		priceId: string | null;
		status: string | null;
		cancelAtPeriodEnd: boolean;
	} => ({
		priceId: subscription?.paddle_price_id ?? null,
		status: (subscription?.status as string | null) ?? null,
		cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
	});

	const startPortalPolling = () => {
		initialSnapshotRef.current = takeSnapshot();
		pollingUntilRef.current = Date.now() + 2 * 60 * 1000;
		syncTriggeredRef.current = false;
		lastSyncAtRef.current = 0;
		if (pollingTimerRef.current) {
			clearInterval(pollingTimerRef.current);
		}
		if (pollingStopTimerRef.current) {
			clearTimeout(pollingStopTimerRef.current);
		}
		setIsPolling(true);
		const tick = async () => {
			// Trigger one sync at start, then every 15s while polling
			const now = Date.now();
			if (!syncTriggeredRef.current || now - lastSyncAtRef.current > 15000) {
				try {
					await fetch("/api/account/subscription/sync-paddle", { method: "POST" });
					lastSyncAtRef.current = now;
				} catch {}
				syncTriggeredRef.current = true;
			}
			try {
				await refreshSubscription();
				const current = takeSnapshot();
				const initial = initialSnapshotRef.current;
				const changed =
					current.priceId !== initial?.priceId ||
					current.status !== initial?.status ||
					current.cancelAtPeriodEnd !== initial?.cancelAtPeriodEnd;
				if (changed) {
					stopPortalPolling();
					return;
				}
				if (pollingUntilRef.current && Date.now() > pollingUntilRef.current) {
					stopPortalPolling();
					return;
				}
			} catch {}
		};
		void tick();
		pollingTimerRef.current = window.setInterval(() => {
			void tick();
		}, 5000);
		// Hard stop as a safety net
		pollingStopTimerRef.current = window.setTimeout(
			() => {
				stopPortalPolling();
			},
			2 * 60 * 1000
		);
	};

	const openPortal = async () => {
		try {
			const res = await fetch("/api/account/subscription/portal");
			if (!res.ok) return;
			const session = await res.json();
			const overviewUrl: string | undefined = session?.data?.urls?.general?.overview;
			if (overviewUrl) {
				window.open(overviewUrl, "_blank");
				startPortalPolling();
			}
		} catch {}
	};

	useEffect(() => {
		const onFocus = () => {
			void refreshSubscription();
		};
		window.addEventListener("focus", onFocus);
		return () => {
			window.removeEventListener("focus", onFocus);
			stopPortalPolling();
		};
	}, [refreshSubscription, stopPortalPolling]);

	return (
		<div
			className={
				" rounded-xs bg-primary p-8 shadow-xl shadow-slate-4xl lg:rounded-xl mt-8"
			}
			style={{
				borderRadius: "12px !important",
			}}>
			{isPolling && (
				<span className="ml-2 text-xs text-primary-foreground-muted hidden">
					(syncing changes…)
				</span>
			)}
			<div className="p-0 space-y-0">
				<div className="flex justify-start items-center pb-2">
					<div className="text-base leading-6 text-secondary-foreground mr-4">
						Subscription:
						<span className="text-primary-foreground-muted ml-2 font-bold">
							{currentPlan?.productTitle ?? "Free Slice"}
						</span>{" "}
					</div>
					{subscription?.status && (
						<Badge variant="secondary">{subscription.status}</Badge>
					)}
				</div>
			</div>
			<div className={"p-0 my-4"}>
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between my-8">
					<div className="flex flex-col gap-2">
						<span className="text-sm">
							Change Subscriptions, View Invoices, Update Payment methods:
						</span>

						<div className="flex gap-1 w-full md:w-fit">
							<Button variant="outline" size="sm" onClick={openPortal}>
								 More Billing Details 
							</Button>
						</div>
					</div>
				</div>

				{subscription && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
						<div className="flex items-center justify-between border rounded-md px-3 py-2">
							<span className="text-primary-foreground-muted text-sm">Status</span>
							<span className="text-sm">{subscription.status}</span>
						</div>
						<div className="flex text-sm items-center justify-between border rounded-md px-3 py-2">
							<span className="text-primary-foreground-muted  text-sm">
								Plan price ID
							</span>
							<span
								className="truncate max-w-[180px] text-sm"
								title={subscription.paddle_price_id ?? undefined}>
								{subscription.paddle_price_id ?? "—"}
							</span>
						</div>
						<div className="flex text-sm items-center justify-between border rounded-md px-3 py-2">
							<span className="text-primary-foreground-muted  text-sm">
								Current period start
							</span>
							<span className="text-sm">
								{formatDateTime(subscription.current_period_start)}
							</span>
						</div>
						<div className="flex  text-sm items-center justify-between border rounded-md px-3 py-2">
							<span className="text-primary-foreground-muted  text-sm">
								Current period end (next bill)
							</span>
							<span className="text-sm">
								{formatDateTime(subscription.current_period_end)}
							</span>
						</div>
						<div className="flex items-center justify-between border rounded-md px-3 py-2">
							<span className="text-primary-foreground-muted  text-sm">Trial end</span>
							<span className="text-sm">{formatDateTime(subscription.trial_end)}</span>
						</div>
						<div className="flex items-center justify-between border rounded-md px-3 py-2">
							<span className="text-primary-foreground-muted  text-sm">
								Cancel at period end
							</span>
							<span className="text-sm">
								{subscription.cancel_at_period_end ? "Yes" : "No"}
							</span>
						</div>
					</div>
				)}
			</div>
			{/* Manual force sync removed; automatic polling handles updates */}
		</div>
	);
}
