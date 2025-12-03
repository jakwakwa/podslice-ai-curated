/**
 * DevTools initialization utility for debugging store connection issues
 */

import { useNotificationStore } from "./notification-store";
import { useUserCurationProfileStore } from "./user-curation-profile-store";

/**
 * Force initialization of all stores and verify devtools connection
 * Call this in your app to ensure stores appear in Redux DevTools
 */
export const initializeStoresForDevTools = () => {
	console.group("🔧 Redux DevTools Store Initialization");

	// Check environment
	console.log("Environment:", process.env.NODE_ENV);
	console.log("DevTools should be enabled:", process.env.NODE_ENV === "development");

	// Initialize stores by accessing their state
	const notificationStore = useNotificationStore.getState();
	const subscriptionStore = null;
	const userCurationProfileStore = useUserCurationProfileStore.getState();

	// Dispatch test actions to make stores visible in DevTools
	try {
		useNotificationStore.getState().setError(null);
	} catch (error) {
		console.error("❌ Notification store error:", error);
	}

	// subscription store disabled in this build

	try {
		useUserCurationProfileStore.getState().setUserCurationProfile(null);
		console.log("✅ User Curation Profile store test action dispatched");
	} catch (error) {
		console.error("❌ User Curation Profile store error:", error);
	}

	// Check if Redux DevTools extension is available
	if (typeof window !== "undefined") {
		// @ts-ignore - checking for Redux DevTools extension
		const hasReduxDevTools = !!(
			window.__REDUX_DEVTOOLS_EXTENSION__ || window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
		);
		console.log("Redux DevTools Extension detected:", hasReduxDevTools);

		if (!hasReduxDevTools) {
			console.warn(
				"⚠️ Redux DevTools Extension not found. Please install it from Chrome Web Store."
			);
		}
	}

	console.groupEnd();

	return {
		notificationStore,
		subscriptionStore,
		userCurationProfileStore,
		environment: process.env.NODE_ENV,
		devToolsEnabled: process.env.NODE_ENV === "development",
	};
};

/**
 * Check if stores are properly configured for DevTools
 */
export const verifyDevToolsSetup = () => {
	const issues: string[] = [];

	// Check environment
	if (process.env.NODE_ENV !== "development") {
		issues.push("Not in development mode - devtools are disabled in production");
	}

	// Check browser extension
	if (typeof window !== "undefined") {
		// @ts-ignore
		if (
			!(
				window.__REDUX_DEVTOOLS_EXTENSION__ || window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
			)
		) {
			issues.push("Redux DevTools browser extension not installed or not enabled");
		}
	}

	return {
		isValid: issues.length === 0,
		issues,
	};
};
