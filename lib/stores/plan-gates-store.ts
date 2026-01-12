"use client";
import { create } from "zustand";

export type PlanGateOption = { value: string; label: string };

type PlanGatesState = {
	options: PlanGateOption[];
	loaded: boolean;
	load: () => Promise<void>;
};

export const usePlanGatesStore = create<PlanGatesState>((set, get) => ({
	options: [],
	loaded: false,
	load: async () => {
		if (get().loaded) return;
		try {
			const res = await fetch("/api/plan-gates", { cache: "force-cache" });
			if (!res.ok) return;
			const data = (await res.json()) as PlanGateOption[];
			set({ options: data, loaded: true });
		} catch {
			set({ loaded: true });
		}
	},
}));
