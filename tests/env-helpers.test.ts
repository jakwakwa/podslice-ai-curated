import { beforeEach, describe, expect, it } from "vitest";
import { getEpisodeTargetMinutes, getProviderWindowSeconds } from "../lib/env";

describe("lib/env - getProviderWindowSeconds", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.PROVIDER_WINDOW_SECONDS = undefined;
	});

	it("returns 270 when env var is missing", () => {
		expect(getProviderWindowSeconds()).toBe(270);
	});

	it("returns 270 when env var is empty string", () => {
		process.env.PROVIDER_WINDOW_SECONDS = "";
		expect(getProviderWindowSeconds()).toBe(270);
	});

	it("returns 270 when env var is invalid (not a number)", () => {
		process.env.PROVIDER_WINDOW_SECONDS = "not-a-number";
		expect(getProviderWindowSeconds()).toBe(270);
	});

	it("returns 270 when env var is zero", () => {
		process.env.PROVIDER_WINDOW_SECONDS = "0";
		expect(getProviderWindowSeconds()).toBe(270);
	});

	it("returns 270 when env var is negative", () => {
		process.env.PROVIDER_WINDOW_SECONDS = "-100";
		expect(getProviderWindowSeconds()).toBe(270);
	});

	it("returns the configured integer value when valid", () => {
		process.env.PROVIDER_WINDOW_SECONDS = "180";
		expect(getProviderWindowSeconds()).toBe(180);
	});

	it("returns the configured integer value when valid (large value)", () => {
		process.env.PROVIDER_WINDOW_SECONDS = "600";
		expect(getProviderWindowSeconds()).toBe(600);
	});

	it("parses float as integer", () => {
		process.env.PROVIDER_WINDOW_SECONDS = "123.456";
		expect(getProviderWindowSeconds()).toBe(123);
	});
});

describe("lib/env - getEpisodeTargetMinutes", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.EPISODE_TARGET_MINUTES = undefined;
	});

	it("returns 4 when env var is missing", () => {
		expect(getEpisodeTargetMinutes()).toBe(4);
	});

	it("returns 4 when env var is empty string", () => {
		process.env.EPISODE_TARGET_MINUTES = "";
		expect(getEpisodeTargetMinutes()).toBe(4);
	});

	it("returns 4 when env var is invalid (not a number)", () => {
		process.env.EPISODE_TARGET_MINUTES = "not-a-number";
		expect(getEpisodeTargetMinutes()).toBe(4);
	});

	it("returns 4 when env var is zero", () => {
		process.env.EPISODE_TARGET_MINUTES = "0";
		expect(getEpisodeTargetMinutes()).toBe(4);
	});

	it("returns 4 when env var is negative", () => {
		process.env.EPISODE_TARGET_MINUTES = "-5";
		expect(getEpisodeTargetMinutes()).toBe(4);
	});

	it("returns the configured number value when valid", () => {
		process.env.EPISODE_TARGET_MINUTES = "6";
		expect(getEpisodeTargetMinutes()).toBe(6);
	});

	it("returns the configured number value when valid (decimal)", () => {
		process.env.EPISODE_TARGET_MINUTES = "3.5";
		expect(getEpisodeTargetMinutes()).toBe(3.5);
	});

	it("accepts small valid values", () => {
		process.env.EPISODE_TARGET_MINUTES = "2";
		expect(getEpisodeTargetMinutes()).toBe(2);
	});

	it("accepts large valid values", () => {
		process.env.EPISODE_TARGET_MINUTES = "15";
		expect(getEpisodeTargetMinutes()).toBe(15);
	});
});
