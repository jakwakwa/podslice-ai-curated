/**
 * Summary Length Configuration
 *
 * Defines the available episode length options for user-generated summaries.
 * Each option has different duration targets and usage credit costs.
 */

export const SUMMARY_LENGTH_OPTIONS = {
	SHORT: {
		minutes: [1, 2] as const,
		words: [150, 280] as const,
		label: "Quick Slice (1-2 mins)",
		description: "Perfect for a quick overview",
		usageCount: 1,
	},
	MEDIUM: {
		minutes: [3, 4] as const,
		words: [420, 560] as const,
		label: "Standard Summary (3-4 mins)",
		description: "Balanced depth and brevity",
		usageCount: 1,
	},
	LONG: {
		minutes: [5, 7] as const,
		words: [700, 980] as const,
		label: "Deep Dive (5-7 mins)",
		description: "Comprehensive coverage",
		usageCount: 2,
	},
} as const;

/**
 * Type representing valid summary length options
 */
export type SummaryLengthOption = keyof typeof SUMMARY_LENGTH_OPTIONS;

/**
 * Type for the configuration object of a summary length option
 */
export type SummaryLengthConfig = (typeof SUMMARY_LENGTH_OPTIONS)[SummaryLengthOption];

/**
 * Get the configuration for a specific summary length option
 *
 * @param length - The summary length option key
 * @returns The configuration object for the specified length
 *
 * @example
 * ```typescript
 * const config = getSummaryLengthConfig("LONG");
 * console.log(config.minutes); // [5, 7]
 * console.log(config.usageCount); // 2
 * ```
 */
export function getSummaryLengthConfig(length: SummaryLengthOption): SummaryLengthConfig {
	return SUMMARY_LENGTH_OPTIONS[length];
}

/**
 * Calculate the total weighted usage count for a collection of episodes
 *
 * This function sums up the usage credits for all episodes, where:
 * - SHORT episodes count as 1 credit
 * - MEDIUM episodes count as 1 credit
 * - LONG episodes count as 2 credits
 * - Episodes without a summary_length default to MEDIUM (1 credit)
 *
 * @param episodes - Array of episodes with optional summary_length field
 * @returns The total weighted usage count
 *
 * @example
 * ```typescript
 * const episodes = [
 *   { summary_length: "SHORT" },
 *   { summary_length: "LONG" },
 *   { summary_length: null }, // defaults to MEDIUM
 * ];
 * const usage = calculateWeightedUsage(episodes); // Returns 4 (1 + 2 + 1)
 * ```
 */
export function calculateWeightedUsage(
	episodes: Array<{ summary_length?: string | null }>
): number {
	return episodes.reduce((total, episode) => {
		// Default to MEDIUM if no summary_length is specified
		const length = (episode.summary_length as SummaryLengthOption) || "MEDIUM";

		// Validate the length and use MEDIUM as fallback for invalid values
		const validLength = length in SUMMARY_LENGTH_OPTIONS ? length : "MEDIUM";

		return total + SUMMARY_LENGTH_OPTIONS[validLength].usageCount;
	}, 0);
}

/**
 * Check if a user has sufficient credits to create an episode of the given length
 *
 * @param currentUsage - The user's current weighted usage count
 * @param requestedLength - The summary length option the user wants to create
 * @param episodeLimit - The user's total episode limit
 * @returns Object with canCreate boolean and remainingCredits
 *
 * @example
 * ```typescript
 * const result = canCreateEpisode(28, "LONG", 30);
 * console.log(result.canCreate); // true
 * console.log(result.remainingCredits); // 2
 * console.log(result.remainingAfterCreation); // 0
 * ```
 */
export function canCreateEpisode(
	currentUsage: number,
	requestedLength: SummaryLengthOption,
	episodeLimit: number
): {
	canCreate: boolean;
	remainingCredits: number;
	requiredCredits: number;
	remainingAfterCreation: number;
} {
	const config = getSummaryLengthConfig(requestedLength);
	const remainingCredits = episodeLimit - currentUsage;
	const requiredCredits = config.usageCount;
	const canCreate = remainingCredits >= requiredCredits;
	const remainingAfterCreation = canCreate
		? remainingCredits - requiredCredits
		: remainingCredits;

	return {
		canCreate,
		remainingCredits,
		requiredCredits,
		remainingAfterCreation,
	};
}

/**
 * Get a user-friendly error message when episode creation is blocked
 *
 * @param currentUsage - The user's current weighted usage count
 * @param requestedLength - The summary length option the user wants to create
 * @param episodeLimit - The user's total episode limit
 * @returns Error message string
 */
export function getInsufficientCreditsMessage(
	currentUsage: number,
	requestedLength: SummaryLengthOption,
	episodeLimit: number
): string {
	const { remainingCredits, requiredCredits } = canCreateEpisode(
		currentUsage,
		requestedLength,
		episodeLimit
	);

	const lengthLabel = SUMMARY_LENGTH_OPTIONS[requestedLength].label.toLowerCase();

	return `Creating this ${lengthLabel} episode would exceed your limit. You have ${remainingCredits} credit${remainingCredits !== 1 ? "s" : ""} remaining, but this episode requires ${requiredCredits} credit${requiredCredits !== 1 ? "s" : ""}.`;
}
