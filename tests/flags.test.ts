import { beforeEach, describe, expect, it } from "vitest"
import { getAdminPanelsFlags, isAutoEpisodesEnabled, isEnabled } from "../lib/flags"

describe("lib/flags", () => {
	const env = process.env
	beforeEach(() => {
		process.env = { ...env }
		process.env.ADMIN_PANELS_V2_BUNDLES = undefined
		process.env.ADMIN_PANELS_V2_PODCASTS = undefined
		process.env.ADMIN_PANELS_V2_EPISODES = undefined
		process.env.NEXT_PUBLIC_ADMIN_PANELS_V2_BUNDLES = undefined
		process.env.NEXT_PUBLIC_ADMIN_PANELS_V2_PODCASTS = undefined
		process.env.NEXT_PUBLIC_ADMIN_PANELS_V2_EPISODES = undefined
		process.env.AUTO_EPISODES_ENABLED = undefined
		process.env.NEXT_PUBLIC_AUTO_EPISODES_ENABLED = undefined
	})

	it("parses truthy and falsy values case-insensitively", () => {
		process.env.ADMIN_PANELS_V2_BUNDLES = "TrUe"
		process.env.ADMIN_PANELS_V2_PODCASTS = "OFF"
		expect(isEnabled("ADMIN_PANELS_V2_BUNDLES")).toBe(true)
		expect(isEnabled("ADMIN_PANELS_V2_PODCASTS")).toBe(false)
	})

	it("prefers NEXT_PUBLIC_* when both are set", () => {
		process.env.ADMIN_PANELS_V2_EPISODES = "false"
		process.env.NEXT_PUBLIC_ADMIN_PANELS_V2_EPISODES = "1"
		const flags = getAdminPanelsFlags()
		expect(flags.episodes).toBe(true)
	})

	it("returns defaults when unset or unparseable", () => {
		expect(isEnabled("SOME_UNKNOWN_FLAG", true)).toBe(true)
		expect(isEnabled("SOME_UNKNOWN_FLAG", false)).toBe(false)
	})

	it("auto-episodes flag defaults to false when unset", () => {
		expect(isAutoEpisodesEnabled()).toBe(false)
	})

	it("auto-episodes flag respects environment variable", () => {
		process.env.AUTO_EPISODES_ENABLED = "true"
		expect(isAutoEpisodesEnabled()).toBe(true)
	})
})
