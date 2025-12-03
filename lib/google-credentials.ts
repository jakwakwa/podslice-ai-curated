// Normalizes GOOGLE_APPLICATION_CREDENTIALS for server runtimes
// - In development: typically a path is used; we leave it as-is
// - In preview/production on Vercel: allow the env var to contain JSON and
//   materialize it to a temp file, then point GOOGLE_APPLICATION_CREDENTIALS to it

let didInitialize = false;
let cachedPath: string | null = null;

function isServer(): boolean {
	return typeof window === "undefined";
}

function getRuntimeEnv(): "production" | "preview" | "development" {
	const v = process.env.VERCEL_ENV;
	if (v === "production" || v === "preview" || v === "development") return v;
	return process.env.NODE_ENV === "production" ? "production" : "development";
}

function looksLikeJson(value: string): boolean {
	const t = value.trim();
	return (
		t.startsWith("{") ||
		t.startsWith("[") ||
		t.includes('"type"') ||
		t.includes('"client_email"')
	);
}

export function ensureGoogleCredentialsForADC(): void {
	if (!isServer()) return;
	if (didInitialize) return;

	const runtime = getRuntimeEnv();
	const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS;

	// If not provided, do nothing. ADC may fall back to other providers.
	if (!raw || raw.trim() === "") {
		didInitialize = true;
		return;
	}

	// Development typically uses a file path, leave untouched unless it's JSON
	if (runtime === "development" && !looksLikeJson(raw)) {
		didInitialize = true;
		return;
	}

	// In preview/production: allow JSON-in-env. Also support JSON in development.
	if (looksLikeJson(raw)) {
		try {
			// Parse and re-serialize to ensure valid JSON and strip whitespace/BOM
			const parsed = JSON.parse(raw);
			const normalized = JSON.stringify(parsed);
			const tmpPath = "/tmp/podslice-gcp-credentials.json";
			// Write synchronously to avoid race conditions in cold starts
			require("node:fs").writeFileSync(tmpPath, normalized, { encoding: "utf8" });
			process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
			cachedPath = tmpPath;
			didInitialize = true;
			return;
		} catch (_err) {
			// If parsing fails, fall through and treat the value as a path
		}
	}

	// If we reach here, the value is assumed to be a path. Leave as-is.
	didInitialize = true;
}

export function getMaterializedCredentialsPath(): string | null {
	return cachedPath;
}
