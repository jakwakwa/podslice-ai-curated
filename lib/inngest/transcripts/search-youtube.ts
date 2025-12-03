import { z } from "zod";

export interface YouTubeSearchInput {
	title: string;
	podcastName?: string;
	publishedAt?: string; // ISO date
	dateBufferDays?: number;
}

type YouTubeSearchItem = {
	id?: { videoId?: string };
	snippet?: {
		title?: string;
		channelTitle?: string;
		publishedAt?: string;
	};
};

function scoreCandidate(item: YouTubeSearchItem, q: YouTubeSearchInput): number {
	const title = (item.snippet?.title || "").toLowerCase();
	const chan = (item.snippet?.channelTitle || "").toLowerCase();
	const qTitle = q.title.toLowerCase();
	const qShow = (q.podcastName || "").toLowerCase();

	let score = 0;
	if (title.includes(qTitle)) score += 0.6;
	if (qShow && (title.includes(qShow) || chan.includes(qShow))) score += 0.3;
	if (q.publishedAt) {
		const target = Date.parse(q.publishedAt);
		const pub = item.snippet?.publishedAt ? Date.parse(item.snippet.publishedAt) : NaN;
		if (!(Number.isNaN(target) || Number.isNaN(pub))) {
			const buf = q.dateBufferDays ?? 14;
			const days = Math.abs(pub - target) / (1000 * 60 * 60 * 24);
			if (days <= buf) score += 0.1;
		}
	}
	return score;
}

export async function searchYouTubeByMetadata(
	input: YouTubeSearchInput
): Promise<string | null> {
	const schema = z.object({
		title: z.string().min(2),
		podcastName: z.string().optional(),
		publishedAt: z.string().optional(),
		dateBufferDays: z.number().optional(),
	});
	const parsed = schema.safeParse(input);
	if (!parsed.success) return null;
	const apiKey = process.env.YOUTUBE_API_KEY;
	if (!apiKey) return null;

	const term = [parsed.data.title, parsed.data.podcastName || ""]
		.filter(Boolean)
		.join(" ");
	const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
	endpoint.searchParams.set("part", "snippet");
	endpoint.searchParams.set("q", term);
	endpoint.searchParams.set("type", "video");
	endpoint.searchParams.set("maxResults", "10");
	endpoint.searchParams.set("key", apiKey);
	if (parsed.data.publishedAt) {
		const d = new Date(parsed.data.publishedAt);
		const buf = parsed.data.dateBufferDays ?? 14;
		const before = new Date(d.getTime() + buf * 86400000);
		const after = new Date(d.getTime() - buf * 86400000);
		endpoint.searchParams.set("publishedAfter", after.toISOString());
		endpoint.searchParams.set("publishedBefore", before.toISOString());
	}

	const res = await fetch(endpoint.toString());
	if (!res.ok) return null;
	const data = (await res.json()) as { items?: YouTubeSearchItem[] };
	const items = Array.isArray(data.items) ? data.items : [];
	if (items.length === 0) return null;

	let best: YouTubeSearchItem | null = null;
	let bestScore = -Infinity;
	for (const item of items) {
		const s = scoreCandidate(item, parsed.data);
		if (s > bestScore) {
			best = item;
			bestScore = s;
		}
	}
	const id = best?.id?.videoId;
	return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
