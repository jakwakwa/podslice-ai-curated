function getEnv(key: string): string | undefined {
	// Read directly from process.env. Vercel injects env vars at runtime.
	return process.env[key];
}

export { getEnv };
