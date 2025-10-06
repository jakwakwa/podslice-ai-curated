// Centralized environment helpers for URLs used across server and client

type RuntimeEnv = "production" | "preview" | "development";

function getRuntimeEnv(): RuntimeEnv {
	const vercelEnv = process.env.VERCEL_ENV as RuntimeEnv | undefined;
	if (vercelEnv === "production" || vercelEnv === "preview" || vercelEnv === "development") {
		return vercelEnv;
	}
	return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function isProduction(): boolean {
	return getRuntimeEnv() === "production";
}

export function getAppUrl(): string {
	// Prod can optionally use a different public base URL to avoid breaking local/preview
	if (isProduction()) {
		return process.env.NEXT_PUBLIC_PRODAPP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
	}
	return process.env.NEXT_PUBLIC_APP_URL || "";
}

export function getClerkSignInUrl(): string {
	if (isProduction()) {
		return process.env.NEXT_PUBLIC_CLERK_PROD_SIGN_UP_URL || process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";
	}
	return process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-up";
}

export function getClerkSignUpUrl(): string {
	if (isProduction()) {
		return process.env.NEXT_PUBLIC_CLERK_PROD_SIGN_UP_URL || process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";
	}
	return process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";
}

export function getAccountPortalUrlWithRedirect(): string | null {
	const portalBase = process.env.NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_URL || null;
	const redirectOverride = process.env.NEXT_PUBLIC_CLERK_ACCOUNT_REDIRECT_URL || null;
	const appUrl = getAppUrl();
	try {
		const redirectTarget = redirectOverride || (appUrl ? new URL(appUrl).origin : "");
		if (!redirectTarget) return null;
		if (portalBase) {
			const base = portalBase.replace(/\/$/, "");
			return `${base}?redirect_url=${encodeURIComponent(redirectTarget)}`;
		}
		if (appUrl) {
			const parsed = new URL(appUrl);
			return `https://accounts.${parsed.hostname}/account?redirect_url=${encodeURIComponent(parsed.origin)}`;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Returns the maximum allowed duration for user-supplied YouTube videos in seconds.
 * Reads from the `MAX_DURATION_SECONDS` environment variable (number of seconds).
 * Falls back to 10000800 seconds (~2789 hours) when not set or invalid.
 */
export function getMaxDurationSeconds(): number {
	const raw = process.env.MAX_DURATION_SECONDS;
	console.log("[DEBUG] getMaxDurationSeconds - raw env var:", raw);
	if (!raw) {
		console.log("[DEBUG] getMaxDurationSeconds - no env var found, using fallback");
		return 10000800; // 10000800 = ~2789 hours for local testing
	}
	const parsed = Number(raw);
	console.log("[DEBUG] getMaxDurationSeconds - parsed value:", parsed, "isFinite:", Number.isFinite(parsed), "isPositive:", parsed > 0);
	if (Number.isFinite(parsed) && parsed > 0) {
		console.log("[DEBUG] getMaxDurationSeconds - returning parsed value:", Math.floor(parsed));
		return Math.floor(parsed);
	}
	console.log("[DEBUG] getMaxDurationSeconds - invalid parsed value, using fallback");
	return 10000800;
}

/**
 * Returns the provider window timeout in seconds.
 * Reads from the `PROVIDER_WINDOW_SECONDS` environment variable.
 * Falls back to 270 seconds (4.5 minutes) when not set or invalid.
 * This is the maximum time allowed for transcription provider operations.
 */
export function getProviderWindowSeconds(): number {
	const raw = process.env.PROVIDER_WINDOW_SECONDS;
	if (!raw) {
		if (process.env.NODE_ENV === "development") {
			console.log("[ENV] PROVIDER_WINDOW_SECONDS not set, using default: 270");
		}
		return 270;
	}
	const parsed = Number.parseInt(raw, 10);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}
	if (process.env.NODE_ENV === "development") {
		console.log("[ENV] Invalid PROVIDER_WINDOW_SECONDS value:", raw, "- using default: 270");
	}
	return 270;
}

/**
 * Returns the target episode length in minutes.
 * Reads from the `EPISODE_TARGET_MINUTES` environment variable.
 * Falls back to 4 minutes when not set or invalid.
 * This controls the target length for generated podcast episodes.
 */
export function getEpisodeTargetMinutes(): number {
	const raw = process.env.EPISODE_TARGET_MINUTES;
	if (!raw) {
		if (process.env.NODE_ENV === "development") {
			console.log("[ENV] EPISODE_TARGET_MINUTES not set, using default: 4");
		}
		return 4;
	}
	const parsed = Number(raw);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}
	if (process.env.NODE_ENV === "development") {
		console.log("[ENV] Invalid EPISODE_TARGET_MINUTES value:", raw, "- using default: 4");
	}
	return 4;
}

// Ensures Paddle API key is present on the server. Never logs the key value.
export function ensurePaddleApiKey(): void {
	// Skip in browser
	if (typeof window !== "undefined") return;
	const key = process.env.PADDLE_API_KEY;
	if (!key || key.trim() === "") {
		throw new Error("[ENV] Missing required PADDLE_API_KEY");
	}
}
// Perform a lightweight startup check on server runtime (skip tests)
(() => {
	if (typeof window !== "undefined") return;
	if (process.env.NODE_ENV === "test") return;
	if (!process.env.PADDLE_API_KEY || process.env.PADDLE_API_KEY.trim() === "") {
		throw new Error("[ENV] Missing required PADDLE_API_KEY");
	}
})();
