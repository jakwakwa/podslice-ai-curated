import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Episode, UserCurationProfileWithRelations } from "@/lib/types";

// Combined episode type for display - extending Prisma Episode with display type
interface CombinedEpisode extends Episode {
	type: "user" | "bundle";
}

interface EpisodesState {
	// State
	episodes: Episode[];
	bundleEpisodes: Episode[];
	combinedEpisodes: CombinedEpisode[];
	userCurationProfile: UserCurationProfileWithRelations | null;
	isLoading: boolean;
	error: string | null;

	// Actions
	fetchEpisodes: () => Promise<void>;
	fetchUserCurationProfile: () => Promise<void>;
	refreshData: () => Promise<void>;
	clearError: () => void;
	reset: () => void;
}

export const useEpisodesStore = create<EpisodesState>()(
	devtools(
		(set, _get) => ({
			// Initial state
			episodes: [],
			bundleEpisodes: [],
			combinedEpisodes: [],
			userCurationProfile: null,
			isLoading: false,
			error: null,

			// Main actions
			fetchEpisodes: async () => {
				try {
					set({ isLoading: true, error: null });

					// Fetch fresh episodes
					// Add cache busting query param + no-store to ensure freshest data
					const response = await fetch(`/api/episodes?ts=${Date.now()}`, {
						cache: "no-store",
					});

					if (!response.ok) {
						throw new Error("Failed to fetch episodes");
					}

					const fetchedEpisodes: Episode[] = await response.json();

					// Process episodes
					const combined: CombinedEpisode[] = fetchedEpisodes.map((ep: Episode) => ({
						...ep,
						type: ep.bundle_id ? "bundle" : ("user" as const),
					}));

					// Sort by published date (newest first)
					combined.sort((a, b) => {
						const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
						const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
						return dateB - dateA;
					});

					set({
						episodes: fetchedEpisodes.filter((ep: Episode) => !ep.bundle_id),
						bundleEpisodes: fetchedEpisodes.filter((ep: Episode) => ep.bundle_id),
						combinedEpisodes: combined,
						isLoading: false,
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to fetch episodes";
					set({ error: message, isLoading: false });
					console.error("Failed to fetch episodes:", error);
				}
			},

			fetchUserCurationProfile: async () => {
				try {
					// Fetch fresh profile
					const response = await fetch("/api/user-curation-profiles");

					if (!response.ok) {
						throw new Error("Failed to fetch user curation profile");
					}

					const fetchedProfile = await response.json();

					set({
						userCurationProfile: fetchedProfile,
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to fetch profile";
					set({ error: message });
					console.error("Failed to fetch user curation profile:", error);
				}
			},

			refreshData: async () => {
				try {
					set({ isLoading: true, error: null });

					// Fetch profile first, then episodes (since episodes depend on profile)
					const profileResponse = await fetch(
						`/api/user-curation-profiles?ts=${Date.now()}`,
						{ cache: "no-store" }
					);
					if (!profileResponse.ok) {
						throw new Error("Failed to fetch user curation profile");
					}
					const fetchedProfile = await profileResponse.json();

					// Now fetch episodes with the updated profile
					const episodesResponse = await fetch(`/api/episodes?ts=${Date.now()}`, {
						cache: "no-store",
					});
					if (!episodesResponse.ok) {
						throw new Error("Failed to fetch episodes");
					}
					const fetchedEpisodes = await episodesResponse.json();

					// Process episodes
					const combined: CombinedEpisode[] = fetchedEpisodes.map((ep: Episode) => ({
						...ep,
						type: ep.bundle_id ? "bundle" : ("user" as const),
					}));

					// Sort by published date (newest first)
					combined.sort((a, b) => {
						const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
						const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
						return dateB - dateA;
					});

					set({
						episodes: fetchedEpisodes.filter((ep: Episode) => !ep.bundle_id),
						bundleEpisodes: fetchedEpisodes.filter((ep: Episode) => ep.bundle_id),
						combinedEpisodes: combined,
						userCurationProfile: fetchedProfile,
						isLoading: false,
					});
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Failed to refresh data";
					set({ error: message, isLoading: false });
					console.error("Failed to refresh data:", error);
				}
			},

			clearError: () => {
				set({ error: null });
			},

			reset: () => {
				set({
					episodes: [],
					bundleEpisodes: [],
					combinedEpisodes: [],
					userCurationProfile: null,
					isLoading: false,
					error: null,
				});
			},
		}),
		{
			name: "episodes-store",
		}
	)
);
