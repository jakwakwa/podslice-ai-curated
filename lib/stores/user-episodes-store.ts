"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { UserEpisode } from "@/lib/types";

interface UserEpisodesStore {
	userEpisodes: UserEpisode[];
	userEpisode: UserEpisode | null;
	completedEpisodeCount: number;
	fetchUserEpisodes: () => Promise<void>;
	fetchUserEpisode: (episodeId: string) => Promise<void>;
	fetchCompletedEpisodeCount: () => Promise<void>;
	createUserEpisode: (userEpisode: UserEpisode) => Promise<void>;
	deleazurelUserEpisodes: () => Promise<void>;
}

export const useUserEpisodesStore = create<UserEpisodesStore>()(
	devtools((set, _get) => ({
		// State
		userEpisodes: [],
		userEpisode: null,
		completedEpisodeCount: 0,

		// Actions
		fetchUserEpisodes: async () => {
			try {
				const response = await fetch("/api/user-episodes");
				if (!response.ok) {
					throw new Error("Failed to fetch user episodes");
				}
				const userEpisodes = await response.json();
				set({ userEpisodes });
			} catch (error) {
				console.error("Error fetching user episodes:", error);
			}
		},

		fetchUserEpisode: async (episodeId: string) => {
			try {
				const response = await fetch(`/api/user-episodes/${episodeId}`);
				if (!response.ok) {
					throw new Error("Failed to fetch user episode");
				}
				const userEpisode = await response.json();
				set({ userEpisode });
			} catch (error) {
				console.error("Error fetching user episode:", error);
			}
		},

		fetchCompletedEpisodeCount: async () => {
			try {
				const response = await fetch("/api/user-episodes?count=true");
				if (!response.ok) {
					throw new Error("Failed to fetch completed episode count");
				}
				const { count } = await response.json();
				set({ completedEpisodeCount: count });
			} catch (error) {
				console.error("Error fetching completed episode count:", error);
			}
		},

		createUserEpisode: async (userEpisode: UserEpisode) => {
			try {
				const response = await fetch("/api/user-episodes", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(userEpisode),
				});
				if (!response.ok) {
					throw new Error("Failed to create user episode");
				}
				const createdEpisode = await response.json();
				set(state => ({
					userEpisodes: [...state.userEpisodes, createdEpisode],
				}));
			} catch (error) {
				console.error("Error creating user episode:", error);
			}
		},

		deleazurelUserEpisodes: async () => {
			try {
				const response = await fetch("/api/user-episodes", {
					method: "DELETE",
				});
				if (!response.ok) {
					throw new Error("Failed to delete all user episodes");
				}
				set({ userEpisodes: [] });
			} catch (error) {
				console.error("Error deleting all user episodes:", error);
			}
		},
	}))
);

export const useUserEpisode = (episodeId: string) => {
	const userEpisodes = useUserEpisodesStore(state => state.userEpisodes);
	return userEpisodes.find(episode => episode.episode_id === episodeId);
};
