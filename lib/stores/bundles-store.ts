import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Bundle, Podcast } from "@/lib/types";

export type BundleWithPodcasts = Bundle & { podcasts: Podcast[] };

interface BundlesState {
	// State
	bundles: BundleWithPodcasts[];
	isLoading: boolean;
	error: string | null;

	// Actions
	fetchBundles: () => Promise<void>;
	refreshData: () => Promise<void>;
	clearError: () => void;
	reset: () => void;
}

export const useBundlesStore = create<BundlesState>()(
	devtools(
		(set, _get) => ({
			// Initial state
			bundles: [],
			isLoading: false,
			error: null,

			// Main actions
			fetchBundles: async () => {
				try {
					set({ isLoading: true, error: null });

					// Fetch fresh bundles
					const response = await fetch("/api/curated-bundles");

					if (!response.ok) {
						throw new Error("Failed to fetch bundles");
					}

					const fetchedBundles: BundleWithPodcasts[] = await response.json();

					set({
						bundles: fetchedBundles,
						isLoading: false,
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : "Failed to fetch bundles";
					set({ error: message, isLoading: false });
					console.error("Failed to fetch bundles:", error);
				}
			},

			refreshData: async () => {
				try {
					set({ isLoading: true, error: null });

					// Fetch fresh data
					const response = await fetch("/api/curated-bundles");

					if (!response.ok) {
						throw new Error("Failed to refresh bundles");
					}

					const fetchedBundles: BundleWithPodcasts[] = await response.json();

					set({
						bundles: fetchedBundles,
						isLoading: false,
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : "Failed to refresh bundles";
					set({ error: message, isLoading: false });
					console.error("Failed to refresh bundles:", error);
				}
			},

			clearError: () => {
				set({ error: null });
			},

			reset: () => {
				set({
					bundles: [],
					isLoading: false,
					error: null,
				});
			},
		}),
		{
			name: "bundles-store",
		}
	)
);
