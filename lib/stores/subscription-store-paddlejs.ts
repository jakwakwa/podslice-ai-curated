import { create } from "zustand";

export interface PaddleSubscription {
	subscription_id: string;
	user_id: string;
	paddle_subscription_id: string | null;
	paddle_price_id: string | null;
	plan_type: "free_slice" | "casual_listener" | "curate_control";
	status: "trialing" | "active" | "canceled" | "paused";
	current_period_start: Date | null;
	current_period_end: Date | null;
	trial_start: Date | null;
	trial_end: Date | null;
	canceled_at: Date | null;
	cancel_at_period_end: boolean;
	created_at: Date;
	updated_at: Date;
}

interface SubscriptionState {
	subscription: PaddleSubscription | null;
	isLoading: boolean;
	error: string | null;

	// Computed properties
	status: string | null;
	plan: string | null;
	trialEndsAt: Date | null;
	cancelAtPeriodEnd: boolean;
	nextBillDate: Date | null;

	// Actions
	setSubscription: (subscription: PaddleSubscription | null) => void;
	setIsLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	cancelSubscription: () => Promise<void>;
	resumeSubscription: () => Promise<void>;
	updatePaymentMethod: () => Promise<void>;
	updateSubscription: (priceId: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
	subscription: null,
	isLoading: false,
	error: null,

	// Computed properties based on subscription
	get status() {
		return get().subscription?.status || null;
	},

	get plan() {
		return get().subscription?.plan_type || null;
	},

	get trialEndsAt() {
		return get().subscription?.trial_end || null;
	},

	get cancelAtPeriodEnd() {
		return get().subscription?.cancel_at_period_end ?? false;
	},

	get nextBillDate() {
		return get().subscription?.current_period_end || null;
	},

	// Actions
	setSubscription: subscription => set({ subscription }),
	setIsLoading: isLoading => set({ isLoading }),
	setError: error => set({ error }),

	cancelSubscription: async () => {
		set({ isLoading: true });
		try {
			const currentSubscription = get().subscription;
			if (currentSubscription) {
				set({
					subscription: {
						...currentSubscription,
						cancel_at_period_end: true,
					},
				});
			}
		} catch (error) {
			set({
				error: error instanceof Error ? error.message : "Failed to cancel subscription",
			});
		} finally {
			set({ isLoading: false });
		}
	},

	resumeSubscription: async () => {
		set({ isLoading: true });
		try {
			const currentSubscription = get().subscription;
			if (currentSubscription) {
				set({
					subscription: {
						...currentSubscription,
						cancel_at_period_end: false,
					},
				});
			}
		} catch (error) {
			set({
				error: error instanceof Error ? error.message : "Failed to resume subscription",
			});
		} finally {
			set({ isLoading: false });
		}
	},

	updatePaymentMethod: async () => {
		set({ isLoading: true });
		set({ isLoading: false });
	},

	updateSubscription: async (_priceId: string) => {
		set({ isLoading: true });
		set({ isLoading: false });
	},
}));
