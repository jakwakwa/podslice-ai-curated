/**
 * Feature flags helpers
 *
 * This module provides a small, typed API for reading boolean feature flags
 * from process.env with sane parsing and defaults.
 *
 * Usage examples:
 *   - isEnabled("ADMIN_PANELS_V2_BUNDLES")
 *   - isAdminPanelsBundlesEnabled()
 *   - getAdminPanelsFlags({ bundles: false, podcasts: false, episodes: false })
 */

const TRUE_VALUES = new Set(["1", "true", "t", "yes", "y", "on"]);
const FALSE_VALUES = new Set(["0", "false", "f", "no", "n", "off"]);

/**
 * Parses a raw environment value into a normalized lowercase token.
 */
function normalizeEnvValue(value: string | undefined): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	if (trimmed.length === 0) return undefined;
	return trimmed.toLowerCase();
}

/**
 * Reads an env flag value, preferring NEXT_PUBLIC_* when present so flags can
 * be surfaced in client bundles safely for non-sensitive toggles.
 */
function readFlagValue(flagName: string): string | undefined {
	const publicName = `NEXT_PUBLIC_${flagName}`;
	const rawPublic = process.env[publicName as keyof NodeJS.ProcessEnv] as unknown as string | undefined;
	if (typeof rawPublic === "string" && rawPublic.length > 0) return rawPublic;
	const raw = process.env[flagName as keyof NodeJS.ProcessEnv] as unknown as string | undefined;
	return raw;
}

/**
 * Returns a boolean for a flag name, using defaultValue if the env var is unset or unparseable.
 */
export function isEnabled(flagName: string, defaultValue: boolean = false): boolean {
	const normalized = normalizeEnvValue(readFlagValue(flagName));
	if (normalized === undefined) return defaultValue;
	if (TRUE_VALUES.has(normalized as typeof TRUE_VALUES extends Set<infer T> ? T : never)) return true;
	if (FALSE_VALUES.has(normalized as typeof FALSE_VALUES extends Set<infer T> ? T : never)) return false;
	return defaultValue;
}

/**
 * Admin panels flag helpers (V2 SSR migration)
 * Defaults are intentionally false. Override via env or provide defaults when calling.
 */
export function isAdminPanelsBundlesEnabled(defaultValue: boolean = false): boolean {
	return isEnabled("ADMIN_PANELS_V2_BUNDLES", defaultValue);
}

export function isAdminPanelsPodcastsEnabled(defaultValue: boolean = false): boolean {
	return isEnabled("ADMIN_PANELS_V2_PODCASTS", defaultValue);
}

export function isAdminPanelsEpisodesEnabled(defaultValue: boolean = false): boolean {
	return isEnabled("ADMIN_PANELS_V2_EPISODES", defaultValue);
}

/**
 * Returns a snapshot of all admin panel flags at once.
 */
export function getAdminPanelsFlags(defaults?: { bundles?: boolean; podcasts?: boolean; episodes?: boolean }) {
	return {
		bundles: isAdminPanelsBundlesEnabled(defaults?.bundles ?? false),
		podcasts: isAdminPanelsPodcastsEnabled(defaults?.podcasts ?? false),
		episodes: isAdminPanelsEpisodesEnabled(defaults?.episodes ?? false),
	};
}
