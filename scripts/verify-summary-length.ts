#!/usr/bin/env tsx
/**
 * Standalone Verification Script for Summary Length Utilities
 *
 * This script tests all summary length utility functions without requiring
 * database connection or test framework setup.
 *
 * Run with: npx tsx scripts/verify-summary-length.ts
 */

import {
	calculateWeightedUsage,
	canCreateEpisode,
	getInsufficientCreditsMessage,
	getSummaryLengthConfig,
	SUMMARY_LENGTH_OPTIONS,
	type SummaryLengthOption,
} from "../lib/types/summary-length";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string): void {
	if (condition) {
		passedTests++;
		console.log(`✅ ${message}`);
	} else {
		failedTests++;
		console.error(`❌ ${message}`);
	}
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
	const condition = JSON.stringify(actual) === JSON.stringify(expected);
	if (condition) {
		passedTests++;
		console.log(`✅ ${message}`);
	} else {
		failedTests++;
		console.error(`❌ ${message}`);
		console.error(`   Expected: ${JSON.stringify(expected)}`);
		console.error(`   Actual:   ${JSON.stringify(actual)}`);
	}
}

console.log("\n🧪 Testing Summary Length Utilities\n");
console.log("═".repeat(60));

// Test 1: Verify OPTIONS constant structure
console.log("\n📦 Testing SUMMARY_LENGTH_OPTIONS constant");
console.log("─".repeat(60));

assert(SUMMARY_LENGTH_OPTIONS.SHORT.usageCount === 1, "SHORT option has usageCount of 1");
assert(
	SUMMARY_LENGTH_OPTIONS.MEDIUM.usageCount === 1,
	"MEDIUM option has usageCount of 1"
);
assert(SUMMARY_LENGTH_OPTIONS.LONG.usageCount === 2, "LONG option has usageCount of 2");
assertEquals(
	SUMMARY_LENGTH_OPTIONS.SHORT.minutes,
	[2, 3],
	"SHORT has correct minute range [2, 3]"
);
assertEquals(
	SUMMARY_LENGTH_OPTIONS.MEDIUM.minutes,
	[5, 7],
	"MEDIUM has correct minute range [5, 7]"
);
assertEquals(
	SUMMARY_LENGTH_OPTIONS.LONG.minutes,
	[7, 10],
	"LONG has correct minute range [7, 10]"
);

// Test 2: getSummaryLengthConfig
console.log("\n🔧 Testing getSummaryLengthConfig function");
console.log("─".repeat(60));

const shortConfig = getSummaryLengthConfig("SHORT");
assert(
	shortConfig.usageCount === 1,
	"getSummaryLengthConfig('SHORT') returns config with usageCount 1"
);

const mediumConfig = getSummaryLengthConfig("MEDIUM");
assert(
	mediumConfig.usageCount === 1,
	"getSummaryLengthConfig('MEDIUM') returns config with usageCount 1"
);

const longConfig = getSummaryLengthConfig("LONG");
assert(
	longConfig.usageCount === 2,
	"getSummaryLengthConfig('LONG') returns config with usageCount 2"
);

// Test 3: calculateWeightedUsage
console.log("\n⚖️  Testing calculateWeightedUsage function");
console.log("─".repeat(60));

assertEquals(calculateWeightedUsage([]), 0, "Empty array returns 0");

assertEquals(
	calculateWeightedUsage([{ summary_length: "SHORT" }, { summary_length: "SHORT" }]),
	2,
	"Two SHORT episodes = 2 credits"
);

assertEquals(
	calculateWeightedUsage([{ summary_length: "LONG" }, { summary_length: "LONG" }]),
	4,
	"Two LONG episodes = 4 credits"
);

assertEquals(
	calculateWeightedUsage([
		{ summary_length: "SHORT" },
		{ summary_length: "MEDIUM" },
		{ summary_length: "LONG" },
	]),
	4,
	"SHORT + MEDIUM + LONG = 4 credits"
);

assertEquals(
	calculateWeightedUsage([{ summary_length: null }, { summary_length: undefined }]),
	2,
	"Null and undefined default to MEDIUM (2 credits)"
);

assertEquals(
	calculateWeightedUsage([{ summary_length: "INVALID" }]),
	1,
	"Invalid length defaults to MEDIUM (1 credit)"
);

// Complex scenario
const complexEpisodes = [
	{ summary_length: "SHORT" }, // 1
	{ summary_length: "SHORT" }, // 1
	{ summary_length: "MEDIUM" }, // 1
	{ summary_length: "LONG" }, // 2
	{ summary_length: "LONG" }, // 2
	{ summary_length: null }, // 1 (defaults to MEDIUM)
	{ summary_length: "MEDIUM" }, // 1
];
assertEquals(
	calculateWeightedUsage(complexEpisodes),
	9,
	"Complex scenario: 7 episodes = 9 credits"
);

// Test 4: canCreateEpisode
console.log("\n🚦 Testing canCreateEpisode function");
console.log("─".repeat(60));

let result = canCreateEpisode(29, "SHORT", 30);
assert(result.canCreate === true, "Can create SHORT with 1 credit remaining");
assert(result.remainingCredits === 1, "Correctly reports 1 credit remaining");
assert(
	result.remainingAfterCreation === 0,
	"Correctly calculates 0 credits after creation"
);

result = canCreateEpisode(29, "LONG", 30);
assert(result.canCreate === false, "Cannot create LONG with only 1 credit remaining");
assert(result.requiredCredits === 2, "Correctly reports LONG requires 2 credits");

result = canCreateEpisode(28, "LONG", 30);
assert(result.canCreate === true, "Can create LONG with exactly 2 credits remaining");
assert(
	result.remainingAfterCreation === 0,
	"Correctly calculates 0 credits after creation"
);

result = canCreateEpisode(30, "SHORT", 30);
assert(result.canCreate === false, "Cannot create any episode with 0 credits remaining");

result = canCreateEpisode(0, "LONG", 30);
assert(result.canCreate === true, "Can create LONG with full credits available");
assert(
	result.remainingAfterCreation === 28,
	"Correctly calculates 28 credits after LONG episode"
);

// Test 5: getInsufficientCreditsMessage
console.log("\n💬 Testing getInsufficientCreditsMessage function");
console.log("─".repeat(60));

let message = getInsufficientCreditsMessage(30, "SHORT", 30);
assert(message.includes("0 credits remaining"), "Message includes '0 credits remaining'");
assert(
	message.includes("requires 1 credit"),
	"Message includes 'requires 1 credit' (singular)"
);
assert(message.includes("quick slice"), "Message includes episode type label");

message = getInsufficientCreditsMessage(29, "LONG", 30);
assert(
	message.includes("1 credit remaining"),
	"Message includes '1 credit remaining' (singular)"
);
assert(
	message.includes("requires 2 credits"),
	"Message includes 'requires 2 credits' (plural)"
);
assert(message.includes("deep dive"), "Message includes episode type label");

message = getInsufficientCreditsMessage(25, "LONG", 30);
assert(
	message.includes("5 credits remaining"),
	"Message includes '5 credits remaining' (plural)"
);

// Test 6: Integration scenarios
console.log("\n🔗 Testing integration scenarios");
console.log("─".repeat(60));

// Scenario: User creates 15 LONG episodes (30 credits)
let currentUsage = 0;
const limit = 30;
const episodes: Array<{ summary_length: SummaryLengthOption }> = [];

for (let i = 0; i < 15; i++) {
	const check = canCreateEpisode(currentUsage, "LONG", limit);
	assert(check.canCreate === true, `Can create LONG episode ${i + 1}/15`);
	episodes.push({ summary_length: "LONG" });
	currentUsage = calculateWeightedUsage(episodes);
}

assertEquals(currentUsage, 30, "15 LONG episodes use all 30 credits");

const finalCheck = canCreateEpisode(currentUsage, "SHORT", limit);
assert(
	finalCheck.canCreate === false,
	"Cannot create any more episodes after limit reached"
);

// Scenario: Mixed episode types
const mixedEpisodes: Array<{ summary_length: SummaryLengthOption }> = [];

// 10 SHORT (10 credits)
for (let i = 0; i < 10; i++) {
	mixedEpisodes.push({ summary_length: "SHORT" });
}

// 5 MEDIUM (5 credits)
for (let i = 0; i < 5; i++) {
	mixedEpisodes.push({ summary_length: "MEDIUM" });
}

// 7 LONG (14 credits)
for (let i = 0; i < 7; i++) {
	mixedEpisodes.push({ summary_length: "LONG" });
}

const mixedUsage = calculateWeightedUsage(mixedEpisodes);
assertEquals(mixedUsage, 29, "Mixed episodes: 10 SHORT + 5 MEDIUM + 7 LONG = 29 credits");

const canAddShort = canCreateEpisode(mixedUsage, "SHORT", limit);
assert(canAddShort.canCreate === true, "Can add one more SHORT episode (29 + 1 = 30)");

const canAddLong = canCreateEpisode(mixedUsage, "LONG", limit);
assert(canAddLong.canCreate === false, "Cannot add LONG episode (29 + 2 = 31 > 30)");

// Print summary
console.log("\n" + "═".repeat(60));
console.log("📊 Test Summary");
console.log("═".repeat(60));
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Total:  ${passedTests + failedTests}`);

if (failedTests > 0) {
	console.log("\n❌ Some tests failed!");
	process.exit(1);
} else {
	console.log("\n✅ All tests passed!");
	console.log("\n🎉 Summary length utilities are working correctly!");
	process.exit(0);
}
