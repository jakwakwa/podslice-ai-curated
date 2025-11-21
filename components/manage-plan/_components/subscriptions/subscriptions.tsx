import type { KeyedMutator } from "swr";
import type { Subscription } from "@/hooks/use-subscription";
import { SubscriptionView } from "./views/subscription-view";

interface SubscriptionsProps {
	onSubscriptionChange?: KeyedMutator<Subscription | null>;
}

export function Subscriptions({ onSubscriptionChange }: SubscriptionsProps) {
	return <SubscriptionView onSubscriptionChange={onSubscriptionChange} />;
}
