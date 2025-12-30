import { create } from "zustand";
import { devtools } from "zustand/middleware";

const initialState = {
	episode: null,
	isSheetOpen: false,
};

export const useAudioPlayerStore = create(
	devtools(
		set => ({
			...initialState,

			// Set the current episode and open the sheet
			setEpisode: episode => {
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
