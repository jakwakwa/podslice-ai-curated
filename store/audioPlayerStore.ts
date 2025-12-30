import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Episode, UserEpisode } from "@/lib/types";

export interface AudioPlayerStore {
	// State
	episode: Episode | UserEpisode | null;
	isSheetOpen: boolean;

	// Actions
	setEpisode: (episode: Episode | UserEpisode) => void;
	closeSheet: () => void;
}

const initialState = {
	episode: null,
	isSheetOpen: false,
};

export const useAudioPlayerStore = create<AudioPlayerStore>()(
	devtools(
		set => ({
			...initialState,

			// Set the current episode and open the sheet
			setEpisode: (episode: Episode | UserEpisode) => {
				set({
					episode,
					isSheetOpen: true,
				});
			},

			// Clear the episode and close the sheet
			closeSheet: () => {
				set({
					episode: null,
					isSheetOpen: false,
				});
			},
		}),
		{
			name: "audio-player-store",
			enabled: process.env.NODE_ENV === "development",
		}
	)
);
