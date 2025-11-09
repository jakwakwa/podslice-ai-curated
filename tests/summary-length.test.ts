/**
 * Summary Length Utility Tests
 *
 * These are PURE UTILITY FUNCTION tests with NO database dependencies.
 * They test mathematical calculations and string formatting only.
 *
 * Note: These tests may fail due to global test setup checking for database
 * configuration, but the functions themselves don't require database access.
 */
import { describe, expect, it } from "vitest";
import {
	calculateWeightedUsage,
	canCreateEpisode,
	getInsufficientCreditsMessage,
	getSummaryLengthConfig,
	SUMMARY_LENGTH_OPTIONS,
	type SummaryLengthOption,
} from "../lib/types/summary-length";

describe("lib/types/summary-length - Pure Utility Functions (No DB Required)", () => {
	describe("SUMMARY_LENGTH_OPTIONS constant", () => {
		it("should have SHORT, MEDIUM, and LONG options", () => {
			expect(SUMMARY_LENGTH_OPTIONS).toHaveProperty("SHORT");
			expect(SUMMARY_LENGTH_OPTIONS).toHaveProperty("MEDIUM");
			expect(SUMMARY_LENGTH_OPTIONS).toHaveProperty("LONG");
		});

		it("should have correct structure for each option", () => {
			const option = SUMMARY_LENGTH_OPTIONS.SHORT;
			expect(option).toHaveProperty("minutes");
			expect(option).toHaveProperty("words");
			expect(option).toHaveProperty("label");
			expect(option).toHaveProperty("description");
			expect(option).toHaveProperty("usageCount");
		});

		it("should have SHORT option with 1 usage count", () => {
			expect(SUMMARY_LENGTH_OPTIONS.SHORT.usageCount).toBe(1);
			expect(SUMMARY_LENGTH_OPTIONS.SHORT.minutes).toEqual([1, 2]);
			expect(SUMMARY_LENGTH_OPTIONS.SHORT.words).toEqual([150, 280]);
		});

		it("should have MEDIUM option with 1 usage count", () => {
			expect(SUMMARY_LENGTH_OPTIONS.MEDIUM.usageCount).toBe(1);
			expect(SUMMARY_LENGTH_OPTIONS.MEDIUM.minutes).toEqual([3, 4]);
			expect(SUMMARY_LENGTH_OPTIONS.MEDIUM.words).toEqual([280, 540]);
		});

		it("should have LONG option with 2 usage count", () => {
			expect(SUMMARY_LENGTH_OPTIONS.LONG.usageCount).toBe(2);
			expect(SUMMARY_LENGTH_OPTIONS.LONG.minutes).toEqual([5, 7]);
			expect(SUMMARY_LENGTH_OPTIONS.LONG.words).toEqual([540, 700]);
		});
	});

	describe("getSummaryLengthConfig", () => {
		it("should return correct config for SHORT", () => {
			const config = getSummaryLengthConfig("SHORT");
			expect(config).toEqual(SUMMARY_LENGTH_OPTIONS.SHORT);
		});

		it("should return correct config for MEDIUM", () => {
			const config = getSummaryLengthConfig("MEDIUM");
			expect(config).toEqual(SUMMARY_LENGTH_OPTIONS.MEDIUM);
		});

		it("should return correct config for LONG", () => {
			const config = getSummaryLengthConfig("LONG");
			expect(config).toEqual(SUMMARY_LENGTH_OPTIONS.LONG);
		});

		it("should return config with correct properties", () => {
			const config = getSummaryLengthConfig("MEDIUM");
			expect(config.minutes).toHaveLength(2);
			expect(config.words).toHaveLength(2);
			expect(typeof config.label).toBe("string");
			expect(typeof config.description).toBe("string");
			expect(typeof config.usageCount).toBe("number");
		});
	});

	describe("calculateWeightedUsage", () => {
		it("should return 0 for empty array", () => {
			const usage = calculateWeightedUsage([]);
			expect(usage).toBe(0);
		});

		it("should count SHORT episodes as 1 credit", () => {
			const episodes = [{ summary_length: "SHORT" }, { summary_length: "SHORT" }];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(2);
		});

		it("should count MEDIUM episodes as 1 credit", () => {
			const episodes = [{ summary_length: "MEDIUM" }, { summary_length: "MEDIUM" }];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(2);
		});

		it("should count LONG episodes as 2 credits", () => {
			const episodes = [{ summary_length: "LONG" }, { summary_length: "LONG" }];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(4);
		});

		it("should handle mixed episode lengths", () => {
			const episodes = [
				{ summary_length: "SHORT" }, // 1
				{ summary_length: "MEDIUM" }, // 1
				{ summary_length: "LONG" }, // 2
			];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(4);
		});

		it("should default null summary_length to MEDIUM (1 credit)", () => {
			const episodes = [{ summary_length: null }, { summary_length: null }];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(2);
		});

		it("should default undefined summary_length to MEDIUM (1 credit)", () => {
			const episodes = [{ summary_length: undefined }, {}];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(2);
		});

		it("should handle invalid summary_length as MEDIUM (1 credit)", () => {
			const episodes = [
				{ summary_length: "INVALID" },
				{ summary_length: "SOMETHING_ELSE" },
			];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(2);
		});

		it("should handle complex real-world scenario", () => {
			const episodes = [
				{ summary_length: "SHORT" }, // 1
				{ summary_length: "SHORT" }, // 1
				{ summary_length: "MEDIUM" }, // 1
				{ summary_length: "LONG" }, // 2
				{ summary_length: "LONG" }, // 2
				{ summary_length: null }, // 1 (defaults to MEDIUM)
				{ summary_length: "MEDIUM" }, // 1
			];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(9);
		});

		it("should handle episodes with extra properties", () => {
			const episodes = [
				{
					summary_length: "SHORT",
					episode_id: "123",
					title: "Test",
					duration: 180,
				},
				{
					summary_length: "LONG",
					episode_id: "456",
					title: "Test 2",
					duration: 600,
				},
			];
			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(3);
		});
	});

	describe("canCreateEpisode", () => {
		it("should allow SHORT episode when user has 1 credit remaining", () => {
			const result = canCreateEpisode(29, "SHORT", 30);
			expect(result.canCreate).toBe(true);
			expect(result.remainingCredits).toBe(1);
			expect(result.requiredCredits).toBe(1);
			expect(result.remainingAfterCreation).toBe(0);
		});

		it("should allow MEDIUM episode when user has 1 credit remaining", () => {
			const result = canCreateEpisode(29, "MEDIUM", 30);
			expect(result.canCreate).toBe(true);
			expect(result.remainingCredits).toBe(1);
			expect(result.requiredCredits).toBe(1);
			expect(result.remainingAfterCreation).toBe(0);
		});

		it("should block LONG episode when user has 1 credit remaining", () => {
			const result = canCreateEpisode(29, "LONG", 30);
			expect(result.canCreate).toBe(false);
			expect(result.remainingCredits).toBe(1);
			expect(result.requiredCredits).toBe(2);
			expect(result.remainingAfterCreation).toBe(1);
		});

		it("should allow LONG episode when user has 2 credits remaining", () => {
			const result = canCreateEpisode(28, "LONG", 30);
			expect(result.canCreate).toBe(true);
			expect(result.remainingCredits).toBe(2);
			expect(result.requiredCredits).toBe(2);
			expect(result.remainingAfterCreation).toBe(0);
		});

		it("should block any episode when user has 0 credits remaining", () => {
			const resultShort = canCreateEpisode(30, "SHORT", 30);
			const resultMedium = canCreateEpisode(30, "MEDIUM", 30);
			const resultLong = canCreateEpisode(30, "LONG", 30);

			expect(resultShort.canCreate).toBe(false);
			expect(resultMedium.canCreate).toBe(false);
			expect(resultLong.canCreate).toBe(false);
		});

		it("should allow any episode when user has plenty of credits", () => {
			const resultShort = canCreateEpisode(0, "SHORT", 30);
			const resultMedium = canCreateEpisode(0, "MEDIUM", 30);
			const resultLong = canCreateEpisode(0, "LONG", 30);

			expect(resultShort.canCreate).toBe(true);
			expect(resultShort.remainingAfterCreation).toBe(29);

			expect(resultMedium.canCreate).toBe(true);
			expect(resultMedium.remainingAfterCreation).toBe(29);

			expect(resultLong.canCreate).toBe(true);
			expect(resultLong.remainingAfterCreation).toBe(28);
		});

		it("should calculate remaining credits correctly for SHORT", () => {
			const result = canCreateEpisode(15, "SHORT", 30);
			expect(result.remainingCredits).toBe(15);
			expect(result.remainingAfterCreation).toBe(14);
		});

		it("should calculate remaining credits correctly for LONG", () => {
			const result = canCreateEpisode(15, "LONG", 30);
			expect(result.remainingCredits).toBe(15);
			expect(result.remainingAfterCreation).toBe(13);
		});

		it("should handle edge case with exactly required credits", () => {
			const result = canCreateEpisode(28, "LONG", 30);
			expect(result.canCreate).toBe(true);
			expect(result.remainingCredits).toBe(2);
			expect(result.requiredCredits).toBe(2);
			expect(result.remainingAfterCreation).toBe(0);
		});
	});

	describe("getInsufficientCreditsMessage", () => {
		it("should generate correct message for SHORT episode with insufficient credits", () => {
			const message = getInsufficientCreditsMessage(30, "SHORT", 30);
			expect(message).toContain("quick slice (2-3 mins)");
			expect(message).toContain("0 credits remaining");
			expect(message).toContain("requires 1 credit");
		});

		it("should generate correct message for LONG episode with 1 credit", () => {
			const message = getInsufficientCreditsMessage(29, "LONG", 30);
			expect(message).toContain("deep dive (7-10 mins)");
			expect(message).toContain("1 credit remaining");
			expect(message).toContain("requires 2 credits");
		});

		it("should use singular 'credit' when only 1 remaining", () => {
			const message = getInsufficientCreditsMessage(29, "LONG", 30);
			expect(message).toContain("1 credit remaining");
			expect(message).not.toContain("1 credits");
		});

		it("should use plural 'credits' when 0 remaining", () => {
			const message = getInsufficientCreditsMessage(30, "SHORT", 30);
			expect(message).toContain("0 credits remaining");
		});

		it("should use plural 'credits' when multiple remaining", () => {
			const message = getInsufficientCreditsMessage(25, "LONG", 30);
			expect(message).toContain("5 credits remaining");
		});

		it("should use singular 'credit' when requires 1", () => {
			const message = getInsufficientCreditsMessage(30, "SHORT", 30);
			expect(message).toContain("requires 1 credit");
			expect(message).not.toContain("requires 1 credits");
		});

		it("should use plural 'credits' when requires 2", () => {
			const message = getInsufficientCreditsMessage(29, "LONG", 30);
			expect(message).toContain("requires 2 credits");
		});

		it("should include all key information", () => {
			const message = getInsufficientCreditsMessage(28, "MEDIUM", 30);
			expect(message).toContain("standard summary (5-7 mins)");
			expect(message).toContain("2 credits remaining");
			expect(message).toContain("requires 1 credit");
			expect(message).toContain("would exceed your limit");
		});
	});

	describe("Integration scenarios", () => {
		it("should handle user starting fresh and creating 15 LONG episodes", () => {
			let currentUsage = 0;
			const limit = 30;
			const episodes: Array<{ summary_length: SummaryLengthOption }> = [];

			// Create 15 LONG episodes (should use all 30 credits)
			for (let i = 0; i < 15; i++) {
				const check = canCreateEpisode(currentUsage, "LONG", limit);
				expect(check.canCreate).toBe(true);

				episodes.push({ summary_length: "LONG" });
				currentUsage = calculateWeightedUsage(episodes);
			}

			expect(currentUsage).toBe(30);

			// Try to create one more - should be blocked
			const finalCheck = canCreateEpisode(currentUsage, "SHORT", limit);
			expect(finalCheck.canCreate).toBe(false);
		});

		it("should handle user mixing different episode lengths", () => {
			const limit = 30;
			const episodes: Array<{ summary_length: SummaryLengthOption }> = [];

			// Create 10 SHORT episodes (10 credits)
			for (let i = 0; i < 10; i++) {
				episodes.push({ summary_length: "SHORT" });
			}

			// Create 5 MEDIUM episodes (5 credits)
			for (let i = 0; i < 5; i++) {
				episodes.push({ summary_length: "MEDIUM" });
			}

			// Create 7 LONG episodes (14 credits)
			for (let i = 0; i < 7; i++) {
				episodes.push({ summary_length: "LONG" });
			}

			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(29);

			// Should be able to create one more SHORT
			const check = canCreateEpisode(usage, "SHORT", limit);
			expect(check.canCreate).toBe(true);

			// Should NOT be able to create one more LONG
			const checkLong = canCreateEpisode(usage, "LONG", limit);
			expect(checkLong.canCreate).toBe(false);
		});

		it("should handle legacy episodes without summary_length", () => {
			const episodes = [
				{ summary_length: null }, // Legacy - defaults to MEDIUM (1)
				{ summary_length: "SHORT" }, // 1
				{ summary_length: "LONG" }, // 2
			];

			const usage = calculateWeightedUsage(episodes);
			expect(usage).toBe(4);

			const check = canCreateEpisode(usage, "LONG", 30);
			expect(check.canCreate).toBe(true);
			expect(check.remainingCredits).toBe(26);
		});
	});
});
