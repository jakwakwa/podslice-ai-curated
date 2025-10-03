"use client";

import { useUser } from "@clerk/nextjs";
import { type InitializePaddleOptions, initializePaddle, type Paddle } from "@paddle/paddle-js";
import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaddlePrices } from "@/hooks/use-paddle-Prices";
import { useSubscriptionStore } from "@/lib/stores/subscription-store-paddlejs";
import type { IBillingFrequency, PaddleCheckoutCompletedData, PlanTier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PriceTitle } from "./pricing/price-title";

// --- Component Props and Interfaces ---

type IPricingPlanProps = {
	paddleProductPlan: PlanTier[];
	onCheckoutCompleted: (data: PaddleCheckoutCompletedData) => void;
	onCheckoutClosed?: () => void;
};
interface IPriceProps {
	loading: boolean;
	value: string | undefined; // Updated to allow undefined as per corrected code logic
	priceSuffix: string;
}

interface IFeatureListProps {
	tier: PlanTier;
	loading: boolean;
}

// --- Helper Components ---

export function FeatureList({ tier, loading }: IFeatureListProps) {
	return (
		<div className="mt-6 flex flex-col px-8">
			{loading ? (
				<Skeleton className="h-[96px] w-full bg-border" />
			) : (
				<ul className={"p-8 flex flex-col gap-4"}>
					{tier.features.map((feature: string) => (
						<li key={feature} className="flex gap-x-3">
							<CircleCheck className={"h-6 w-6 text-muted-foreground"} />
							<span className={"text-base"}>{feature}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function PriceAmount({ loading, priceSuffix, value }: IPriceProps) {
	// Format helper: drop trailing .00 or ,00 to display whole-unit prices (e.g., $5.00 -> $5, €5,00 -> €5)
	const formattedValue = value ? value.replace(/([,.]00)(?=(\s|$))/, "") : value;
	return (
		<div className="mt-2 flex flex-col px-8">
			{loading ? (
				<Skeleton className="h-[96px] w-full bg-border" />
			) : (
				<>
					<div className={cn("text-[40px] leading-[46px] tracking-[-1.6px] font-medium")}>{formattedValue ? formattedValue : "n/a"}</div>
					<div className={cn("font-medium leading-[12px] text-[12px]")}>{priceSuffix}</div>
				</>
			)}
		</div>
	);
}

// --- Main Pricing Plans Component ---

export function PricingPlans({ paddleProductPlan, onCheckoutCompleted, onCheckoutClosed }: IPricingPlanProps) {
	//  ALWAYS MONTHLY ( 30 days from datee of purchase  )
	const [frequency, _setFrequency] = useState<IBillingFrequency>({ value: "month", label: "Monthly", priceSuffix: "per month" });
	const [paddle, setPaddle] = useState<Paddle>();

	// Detect buyer country from browser locale to localize prices and enable Paddle's auto currency conversion
	const [countryCode, setCountryCode] = useState<string>("OTHERS");
	useEffect(() => {
		function detectCountryFromLocale(): string {
			try {
				const primaryLang = (typeof navigator !== "undefined" && (navigator.languages?.[0] || navigator.language)) || "";
				const resolved = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : "";
				const candidates = [primaryLang, resolved];
				const regionRegex = /[-_]([A-Za-z]{2})(?:$|[-_])/;
				for (const loc of candidates) {
					const match = loc ? regionRegex.exec(loc) : null;
					const region = match?.[1];
					if (region) return region.toUpperCase();
				}
			} catch (_e) {
				// noop: fall through to default
			}
			return "OTHERS";
		}

		setCountryCode(detectCountryFromLocale());
	}, []);

	// Call the custom hook to get localized prices using detected country code.
	// When countryCode is "OTHERS", the hook will omit address so Paddle returns default pricing.
	const { prices, loading } = usePaddlePrices(paddle, countryCode);

	// Defensive UI: hide/disable when an active-like subscription exists
	const subscription = useSubscriptionStore(state => state.subscription);
	const status = subscription?.status && typeof subscription.status === "string" ? subscription.status.toLowerCase() : null;
	const hasActiveSubscription = Boolean(subscription && (status === "active" || status === "trialing" || status === "paused"));

	useEffect(() => {
		// Correctly accessing the client-side environment variable.
		const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

		if (!clientToken) {
			console.error("Paddle Client Token is not set. Please ensure the NEXT_PUBLIC_PADDLE_CLIENT_TOKEN environment variable is configured correctly.");
			return;
		}

		initializePaddle({
			environment: process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox",
			token: clientToken,
			eventCallback: (data: { name: string; data?: PaddleCheckoutCompletedData }) => {
				if (data.name === "checkout.completed" && data.data) {
					onCheckoutCompleted(data.data as PaddleCheckoutCompletedData);
				}
				if (data.name === "checkout.closed") {
					// Ensure membership state refresh when checkout is closed
					onCheckoutClosed?.();
				}
			},
		} as unknown as InitializePaddleOptions)
			.then((paddleInstance: Paddle | undefined) => {
				if (paddleInstance) {
					setPaddle(paddleInstance);
				}
			})
			.catch((error: Error) => {
				// Log any errors during initialization to prevent uncaught promises
				console.error("Failed to initialize Paddle:", error);
			});
	}, [onCheckoutCompleted, onCheckoutClosed]);

	const { user } = useUser();
	const customerInfo = user?.primaryEmailAddress?.emailAddress ? { email: user.primaryEmailAddress.emailAddress } : undefined;

	const openPaddleCheckout = (e: React.FormEvent, id: string) => {
		e.preventDefault();
		if (hasActiveSubscription) {
			return;
		}
		if (paddle && id) {
			paddle.Checkout.open({
				items: [
					{
						priceId: id,
						quantity: 1,
					},
				],
				...(customerInfo ? { customer: customerInfo } : {}),
			});
		}
	};

	return (
		<>
			{!hasActiveSubscription &&
				paddleProductPlan?.map(tier => (
					<Card key={tier.priceId} className={cn("rounded-lg bg-background/70  overflow-hidden flex-1")}>
						<div className={cn("flex gap-5 flex-col rounded-lg rounded-b-none pricing-card-border")}>
							<PriceTitle tier={tier} />
							<PriceAmount
								loading={loading}
								// This is the main fix: Use the tier's priceId to look up the correct price from the prices object.
								value={prices?.[tier.priceId]}
								priceSuffix={frequency.priceSuffix}
							/>
							<div className={"px-8"}>
								<Separator className={"bg-border"} />
							</div>
							<div className={"px-8 text-[16px] leading-[24px]"}>{tier.description}</div>
						</div>
						<div className={"px-8 mt-8"}>
							<Button onClick={e => openPaddleCheckout(e, tier.priceId)} className={"w-full"} variant={"secondary"} disabled={hasActiveSubscription}>
								Upgrade
							</Button>
						</div>
						<FeatureList tier={tier} loading={loading} />
					</Card>
				))}
		</>
	);
}
