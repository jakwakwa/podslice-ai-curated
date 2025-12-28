import { create } from "zustand";

export interface DashboardState {
	selectedTicker: string | null;
	minSentiment: number; // -1.0 to 1.0
	viewMode: "TABLE" | "GRID"; // Professionals prefer TABLE

	// Actions
	setTickerFilter: (ticker: string | null) => void;
	setMinSentiment: (value: number) => void;
	setViewMode: (mode: "TABLE" | "GRID") => void;
}

export const useDashboardStore = create<DashboardState>(set => ({
	selectedTicker: null,
	minSentiment: -1.0, // Default: show all sentiment
	viewMode: "TABLE",

	setTickerFilter: ticker => set({ selectedTicker: ticker }),
	setMinSentiment: value => set({ minSentiment: value }),
	setViewMode: mode => set({ viewMode: mode }),
}));
