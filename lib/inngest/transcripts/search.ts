import { z } from "zod";

type ListenNotesEpisode = {
	id?: string;
	title_original?: string;
	podcast_title_original?: string;
	audio?: string;
	audio_length_sec?: number;
	pub_date_ms?: number;
	listennotes_url?: string;
};

type ListenNotesSearchResponse = {
	results?: ListenNotesEpisode[];
};

export interface EpisodeSearchInput {
	title: string;
	podcastName?: string;
	publishedAt?: string; // ISO date
}

export interface EpisodeSearchResult {
	audioUrl: string;
	source: "listen-notes";
	meta?: Record<string, unknown>;
}

function isDirectAudioUrl(url: string | undefined): url is string {
	return Boolean(url && /\.(mp3|m4a|wav|aac|flac)(\b|$)/i.test(url));
}

function scoreEpisodeMatch(ep: ListenNotesEpisode, query: EpisodeSearchInput): number {
	let score = 0;
	const title = (ep.title_original || "").toLowerCase();
	const podcast = (ep.podcast_title_original || "").toLowerCase();

	if (title && query.title) {
		const q = query.title.toLowerCase();
		if (title.includes(q)) score += 5;
	}
	if (query.podcastName) {
		const qPodcast = query.podcastName.toLowerCase();
		if (podcast.includes(qPodcast)) score += 3;
	}
	if (query.publishedAt && ep.pub_date_ms) {
		const target = new Date(query.publishedAt).getTime();
		const deltaDays = Math.abs(ep.pub_date_ms - target) / (1000 * 60 * 60 * 24);
		// Prefer closer to the target date
		score += Math.max(0, 3 - Math.min(3, Math.floor(deltaDays)));
	}
	if (isDirectAudioUrl(ep.audio)) score += 2;
	return score;
}

export async function searchEpisodeAudioViaListenNotes(
	query: EpisodeSearchInput
): Promise<EpisodeSearchResult | null> {
	const apiKey = process.env.LISTEN_NOTES_API_KEY;
	if (!apiKey) return null;

	const schema = z.object({
		title: z.string().min(2),
		podcastName: z.string().optional(),
		publishedAt: z.string().optional(),
	});
	const parsed = schema.safeParse(query);
	if (!parsed.success) return null;

	const endpoint = new URL("https://listen-api.listennotes.com/api/v2/search");
	const qParts: string[] = [parsed.data.title];
	if (parsed.data.podcastName) qParts.push(parsed.data.podcastName);
	endpoint.searchParams.set("q", qParts.join(" "));
	endpoint.searchParams.set("type", "episode");
	endpoint.searchParams.set("only_in", "title,description");
	endpoint.searchParams.set("sort_by_date", "0");
	endpoint.searchParams.set("offset", "0");
	endpoint.searchParams.set("len_min", "0");
	endpoint.searchParams.set("len_max", "36000");

	const res = await fetch(endpoint.toString(), {
		headers: { "X-ListenAPI-Key": apiKey },
	});
	if (!res.ok) return null;
	const data = (await res.json()) as ListenNotesSearchResponse;
	const results = Array.isArray(data.results) ? data.results : [];
	if (results.length === 0) return null;

	let best: ListenNotesEpisode | null = null;
	let bestScore = -Infinity;
	for (const ep of results) {
		const s = scoreEpisodeMatch(ep, parsed.data);
		if (s > bestScore) {
			best = ep;
			bestScore = s;
		}
	}
	if (!(best && isDirectAudioUrl(best.audio))) return null;

	return {
		audioUrl: best.audio!,
		source: "listen-notes",
		meta: { id: best.id, listennotes_url: best.listennotes_url },
	};
}

// Apple / iTunes Search API resolver
type ITunesResult = {
	collectionName?: string;
	feedUrl?: string;
	trackName?: string;
	trackViewUrl?: string;
};

async function tryFetch(url: string): Promise<Response | null> {
	try {
		const res = await fetch(url);
		return res.ok ? res : null;
	} catch {
		return null;
	}
}

async function fetchItunesSearch(
	term: string,
	entity: string,
	limit = 25
): Promise<ITunesResult[]> {
	const endpoint = new URL("https://itunes.apple.com/search");
	endpoint.searchParams.set("term", term);
	endpoint.searchParams.set("entity", entity);
	endpoint.searchParams.set("limit", String(limit));
	const res = await tryFetch(endpoint.toString());
	if (!res) return [];
	const data = (await res.json()) as { results?: ITunesResult[] };
	return Array.isArray(data.results) ? data.results : [];
}

function titleSimilarity(a: string, b: string): number {
	const ax = a.toLowerCase();
	const bx = b.toLowerCase();
	if (ax === bx) return 1;
	if (ax.includes(bx) || bx.includes(ax)) return 0.8;
	// very rough token overlap
	const at = new Set(ax.split(/\s+/).filter(Boolean));
	const bt = new Set(bx.split(/\s+/).filter(Boolean));
	const inter = [...at].filter(t => bt.has(t)).length;
	const union = new Set([...at, ...bt]).size;
	return union ? inter / union : 0;
}

export async function searchEpisodeAudioViaApple(
	query: EpisodeSearchInput
): Promise<EpisodeSearchResult | null> {
	// 1) Find podcast feed from show name
	const term = [query.podcastName || "", query.title].filter(Boolean).join(" ");
	const podcasts = await fetchItunesSearch(term, "podcast", 10);
	const candidates = podcasts.filter(p => typeof p.feedUrl === "string");
	if (candidates.length === 0) return null;

	// 2) Fetch feed(s) and try to match an item by title / date buffer
	const buffersDays = 14;
	const targetTs = query.publishedAt ? new Date(query.publishedAt).getTime() : null;

	for (const p of candidates) {
		const feedUrl = p.feedUrl as string;
		try {
			const res = await fetch(feedUrl);
			if (!res.ok) continue;
			const xml = await res.text();
			// quick parse by regex to avoid pulling full XML parser again
			// fallback to PodcastRssProvider in orchestrator for robust parse
			const items = xml.split(/<item[\s>]/i);
			let bestAudio: string | null = null;
			let bestScore = -Infinity;
			for (const raw of items) {
				const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/i);
				const enclosureMatch = raw.match(/enclosure[^>]*url="([^"]+)"/i);
				const pubDateMatch = raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
				const audio = enclosureMatch ? enclosureMatch[1] : null;
				if (!(audio && isDirectAudioUrl(audio))) continue;
				const title = titleMatch ? (titleMatch[1] ?? "") : "";
				const scoreTitle = titleSimilarity(title, query.title);
				let scoreDate = 0;
				if (targetTs && pubDateMatch) {
					const ts = Date.parse(pubDateMatch[1]!);
					if (!Number.isNaN(ts)) {
						const days = Math.abs(ts - targetTs) / (1000 * 60 * 60 * 24);
						scoreDate = days <= buffersDays ? 0.2 : 0;
					}
				}
				const score = scoreTitle + scoreDate;
				if (score > bestScore) {
					bestScore = score;
					bestAudio = audio;
				}
			}
			if (bestAudio)
				return {
					audioUrl: bestAudio,
					source: "listen-notes",
					meta: { via: "apple", feedUrl },
				};
		} catch {}
	}
	return null;
}
