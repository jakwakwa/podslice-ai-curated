import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Absolute path to the repository root (directory containing this config file)
const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		coverage: { provider: "v8" },
		pool: "threads",
		poolOptions: {
			threads: { singleThread: true },
		},
	},
	// Avoid loading project PostCSS config during tests
	css: { postcss: {} },
	resolve: {
		alias: [{ find: /^@\//, replacement: `${rootDir}/` }],
		conditions: ["import", "module", "browser", "default"],
		mainFields: ["module", "main"],
	},
	plugins: [],
});
