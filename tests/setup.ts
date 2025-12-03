import "dotenv/config";
import fs from "node:fs";
import { config as loadEnv } from "dotenv";
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Load .env.test if present
if (fs.existsSync(".env.test")) {
	loadEnv({ path: ".env.test" });
}

// Prefer explicit TEST_* envs provided by the user
const testPrismaUrl =
	process.env.TEST_POSTGRES_PRISMA_URL || process.env.TEST_DATABASE_URL;
if (testPrismaUrl) {
	process.env.DATABASE_URL = testPrismaUrl;
}

if (!process.env.DATABASE_URL) {
	throw new Error(
		"DATABASE_URL must be set for tests (use TEST_POSTGRES_PRISMA_URL or TEST_DATABASE_URL)"
	);
}

// Basic safety: prevent running on non-test DB by convention
if (!/test|_test|\bqa\b/i.test(process.env.DATABASE_URL)) {
	// Allow if user provided explicit TEST_* values even if they don't contain 'test'
	if (!(process.env.TEST_POSTGRES_PRISMA_URL || process.env.TEST_DATABASE_URL)) {
		throw new Error(
			"Refusing to run tests against a non-test database. Provide TEST_* envs."
		);
	}
}

// Silence noisy logs in tests
const silence = [
	"Episodes API:",
	"Upload episode request:",
	"[CURATED_BUNDLES_GET]",
	"Initializing Storage clients",
];
const originalLog = console.log;
console.log = (...args: unknown[]) => {
	if (silence.some(s => String(args[0] ?? "").includes(s))) return;
	originalLog(...args);
};

// Mock Clerk server auth by default to avoid importing the real module in route handlers
vi.mock("@clerk/nextjs/server", () => ({
	auth: vi.fn(async () => ({ userId: globalThis.__mockUserId ?? "test-user" })),
	currentUser: vi.fn(async () => ({
		id: globalThis.__mockUserId ?? "test-user",
		emailAddresses: [],
	})),
}));

declare global {
	// eslint-disable-next-line no-var
	var __mockUserId: string | null | undefined;
}
