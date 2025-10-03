"use client";

import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_CONFIG } from "@/config/ai";
import { useSubscriptionStore } from "@/lib/stores/subscription-store-paddlejs";

export function SubscriptionTestControlsPaddle() {
	const { setSubscription, subscription } = useSubscriptionStore(
		useShallow(state => ({
			setSubscription: state.setSubscription,
			subscription: state.subscription,
		}))
	);
	const [isVisible, setIsVisible] = useState(true);

	// Mock subscription states for testing
	const mockSubscriptions = {
		free: null,
		trial: {
			subscription_id: "sub_01hg93js9",
			user_id: "user_123456789",
			paddle_subscription_id: "sub_01hg93js9a5j5r7q8x2z4c6v8",
			paddle_price_id: PAYMENT_CONFIG.PADDLE.CASUAL_LISTENER,
			plan_type: "casual_listener" as const,
			status: "trialing" as const,
			current_period_start: new Date("2024-01-01"),
			current_period_end: new Date("2024-02-01"),
			trial_start: new Date("2023-12-15"),
			trial_end: new Date("2024-01-15"),
			canceled_at: null,
			cancel_at_period_end: false,
			created_at: new Date("2023-12-15"),
			updated_at: new Date("2024-01-01"),
		},
		casual: {
			subscription_id: "sub_01hg93kt0",
			user_id: "user_123456789",
			paddle_subscription_id: "sub_01hg93kt0b6k6s8r9y3a5d7w9",
			paddle_price_id: PAYMENT_CONFIG.PADDLE.CASUAL_LISTENER,
			plan_type: "casual_listener" as const,
			status: "active" as const,
			current_period_start: new Date("2024-01-01"),
			current_period_end: new Date("2024-02-01"),
			trial_start: new Date("2023-12-15"),
			trial_end: new Date("2024-01-01"),
			canceled_at: null,
			cancel_at_period_end: false,
			created_at: new Date("2023-12-15"),
			updated_at: new Date("2024-01-01"),
		},
		premium: {
			subscription_id: "sub_01hg93lu1",
			user_id: "user_123456789",
			paddle_subscription_id: "sub_01hg93lu1c7l7t9s0z4b6e8x0",
			paddle_price_id: PAYMENT_CONFIG.PADDLE.CURATE_CONTROL,
			plan_type: "curate_control" as const,
			status: "active" as const,
			current_period_start: new Date("2024-01-01"),
			current_period_end: new Date("2024-02-01"),
			trial_start: new Date("2023-12-15"),
			trial_end: new Date("2024-01-01"),
			canceled_at: null,
			cancel_at_period_end: false,
			created_at: new Date("2023-12-15"),
			updated_at: new Date("2024-01-01"),
		},
		canceled: {
			subscription_id: "sub_01hg93mv2",
			user_id: "user_123456789",
			paddle_subscription_id: "sub_01hg93mv2d8m8u0t1a5c7f9y1",
			paddle_price_id: PAYMENT_CONFIG.PADDLE.CASUAL_LISTENER,
			plan_type: "casual_listener" as const,
			status: "canceled" as const,
			current_period_start: new Date("2024-01-01"),
			current_period_end: new Date("2024-02-01"),
			trial_start: new Date("2023-12-15"),
			trial_end: new Date("2024-01-01"),
			canceled_at: new Date("2024-01-15"),
			cancel_at_period_end: true,
			created_at: new Date("2023-12-15"),
			updated_at: new Date("2024-01-15"),
		},
		canceling: {
			subscription_id: "sub_01hg93nw3",
			user_id: "user_123456789",
			paddle_subscription_id: "sub_01hg93nw3e9n9v1u2b6d8g0z2",
			paddle_price_id: PAYMENT_CONFIG.PADDLE.CASUAL_LISTENER,
			plan_type: "casual_listener" as const,
			status: "active" as const,
			current_period_start: new Date("2024-01-01"),
			current_period_end: new Date("2024-02-01"),
			trial_start: new Date("2023-12-15"),
			trial_end: new Date("2024-01-01"),
			canceled_at: null,
			cancel_at_period_end: true,
			created_at: new Date("2023-12-15"),
			updated_at: new Date("2024-01-15"),
		},
	};

	const getCurrentPlanName = () => {
		if (!subscription) return "FreeSlice";
		return subscription.plan_type === "casual_listener" ? "Casual Listener" : "Curate & Control";
	};

	return (
		<div className="fixed bottom-4 right-4 z-50">
			{/* Toggle Button */}
			<Button onClick={() => setIsVisible(!isVisible)} variant="outline" size="sm" className="bg-background/80">
				{isVisible ? "Hide" : "Show"} Paddle Test Controls
			</Button>

			{/* Test Controls Panel */}
			{isVisible && (
				<Card className="w-80 mt-2 bg-background/95 border-2">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm">Paddle Subscription Test Controls</CardTitle>
						<CardDescription className="text-xs">Switch between different subscription states for testing</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{/* Current State Display */}
						<div className="p-2 bg-muted rounded-md text-xs">
							<strong>Current:</strong> {subscription ? getCurrentPlanName() : "FreeSlice"}
							<br />
							<strong>Status:</strong> {subscription?.status || "Free"}
							{subscription?.cancel_at_period_end && <span className="text-yellow-600"> (Canceling)</span>}
						</div>

						{/* Test Buttons */}
						<div className="grid grid-cols-2 gap-2">
							<Button variant="outline" size="sm" onClick={() => setSubscription(mockSubscriptions.free)} className="text-xs">
								FreeSlice
							</Button>
							<Button variant="outline" size="sm" onClick={() => setSubscription(mockSubscriptions.trial)} className="text-xs">
								Trial
							</Button>
							<Button variant="outline" size="sm" onClick={() => setSubscription(mockSubscriptions.casual)} className="text-xs">
								Casual
							</Button>
							<Button variant="outline" size="sm" onClick={() => setSubscription(mockSubscriptions.premium)} className="text-xs">
								Premium
							</Button>
							<Button variant="outline" size="sm" onClick={() => setSubscription(mockSubscriptions.canceling)} className="text-xs">
								Canceling
							</Button>
							<Button variant="outline" size="sm" onClick={() => setSubscription(mockSubscriptions.canceled)} className="text-xs">
								Canceled
							</Button>
						</div>

						{/* Status Badges */}
						<div className="flex flex-wrap gap-1">
							<Badge variant="secondary" className="text-xs">
								{subscription?.status || "Free"}
							</Badge>
							{subscription?.trial_end && new Date(subscription.trial_end) > new Date() && (
								<Badge variant="outline" className="text-xs">
									Trial
								</Badge>
							)}
							{subscription?.cancel_at_period_end && (
								<Badge variant="outline" className="text-xs text-yellow-600">
									Canceling
								</Badge>
							)}
							{subscription?.canceled_at && (
								<Badge variant="destructive" className="text-xs">
									Canceled
								</Badge>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
