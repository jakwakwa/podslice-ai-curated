// YouTube audio helper module — high-level audio extraction removed per project policy.
// Keeping the module as a stub in case lower-level utilities are needed in future.

export function extractVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
		/^([a-zA-Z0-9_-]{11})$/,
	];
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1] ?? null;
	}
	return null;
}
