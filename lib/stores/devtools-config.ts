import type { DevtoolsOptions } from "zustand/middleware";

/**
 * Devtools configuration for Zustand stores
 * Only enabled in development environment for better performance in production
 */
export const createDevtoolsConfig = (storeName: string): DevtoolsOptions => ({
	name: storeName,
	enabled: process.env.NODE_ENV === "development",
});

/**
 * Common devtools configurations for existing stores
 */
export const devtoolsConfigs = {
	notification: createDevtoolsConfig("notification-store"),
	subscription: createDevtoolsConfig("subscription-store"),
	userCurationProfile: createDevtoolsConfig("user-curation-profile-store"),
} as const;
