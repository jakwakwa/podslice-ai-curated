import { toast } from "sonner";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { UserIngestionConfig } from "@/lib/types";

export interface UserConfigStore {
	// State
	config: UserIngestionConfig | null;
	isLoading: boolean;
	error: string | null;

	// Actions
	loadConfig: () => Promise<void>;
	updateConfig: (data: {
		topic: string | null;
		rss_feed_url: string | null;
		api1_url?: string | null;
		api2_url?: string | null;
	}) => Promise<{ success: boolean } | { error: string }>;
	reset: () => void;
}

const initialState = {
	config: null,
	isLoading: false,
	error: null,
};

export const useUserConfigStore = create<UserConfigStore>()(
	devtools(
		set => ({
			...initialState,

			loadConfig: async () => {
				set({ isLoading: true, error: null });

				try {
					const response = await fetch("/api/user-config");

					if (!response.ok) {
						throw new Error(`Failed to load config: ${response.status}`);
					}

					const config = await response.json();

					set({
						config,
						isLoading: false,
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error";
					set({
						error: message,
						isLoading: false,
					});
					console.error("Failed to load user config:", error);
				}
			},

			updateConfig: async data => {
				set({ isLoading: true, error: null });

				try {
					const response = await fetch("/api/user-config", {
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(data),
					});

					if (!response.ok) {
						throw new Error(`Failed to update config: ${response.status}`);
					}

					const updatedConfig = await response.json();

					set({
						config: updatedConfig,
						isLoading: false,
					});

					toast.success("Content preferences saved successfully!");
					return { success: true };
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error";
					set({
						error: message,
						isLoading: false,
					});
					console.error("Failed to update user config:", error);
					toast.error("Failed to save content preferences");
					return { error: message };
				}
			},

			reset: () => {
				set(initialState);
			},
		}),
		{
			name: "user-config-store",
		}
	)
);
