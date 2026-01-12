export type RssEntry = {
	videoUrl: string;
	title: string;
	publishedDate: Date | null;
};

/**
 * Extracts a YouTube channel ID from a channel URL (@ handle or /channel/ format)
 */
export async function extractChannelId(channelUrl: string): Promise<string | null> {
	if (!channelUrl) return null;

	const url = safeParseUrl(channelUrl);
	if (!url) return null;

	// Check if it's a YouTube domain
	const isYouTube =
		url.hostname === "youtube.com" ||
		url.hostname === "www.youtube.com" ||
		url.hostname === "m.youtube.com";
	if (!isYouTube) return null;

	// Extract from /channel/UC... format
	const channelMatch = url.pathname.match(/\/channel\/(UC[\w-]+)/);
	if (channelMatch?.[1]) {
		return channelMatch[1];
	}

	// Extract from /@handle format - need to fetch the page to get channel ID
	const handleMatch = url.pathname.match(/\/@([\w-]+)/);
	if (handleMatch?.[1]) {
		try {
			// Fetch the channel page to extract the channel ID from meta tags
			const response = await fetch(channelUrl);
			if (!response.ok) return null;
			const html = await response.text();

			// Look for channel ID in meta tags or structured data
			const channelIdMatch = html.match(/"channelId":"(UC[\w-]+)"/);
			if (channelIdMatch?.[1]) {
				return channelIdMatch[1];
			}
		} catch {
			return null;
		}
	}

	return null;
}

/**
 * Extracts a YouTube playlist ID from a URL or returns the input if it already looks like an ID.
 */
export function extractPlaylistId(inputUrlOrId: string): string | null {
	if (!inputUrlOrId) return null;

	// Already an RSS playlist feed URL
	if (inputUrlOrId.includes("feeds/videos.xml")) {
		const url = safeParseUrl(inputUrlOrId);
		const playlistId = url?.searchParams.get("playlist_id");
		return playlistId || null;
	}

	// Try standard URL with list= param
	const url = safeParseUrl(inputUrlOrId);
	if (url) {
		const listParam = url.searchParams.get("list");
		if (listParam) return listParam;
	}

	// Fallback: if it looks like a playlist id (PL... or OL...)
	if (/^[A-Za-z0-9_-]{10,}$/.test(inputUrlOrId)) {
		return inputUrlOrId;
	}

	return null;
}

/**
 * Constructs RSS URL for either a playlist ID or channel ID
 */
export function constructRssUrl(playlistOrChannelId: string): string {
	// Channel IDs start with UC
	if (playlistOrChannelId.startsWith("UC")) {
		return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(playlistOrChannelId)}`;
	}
	// Otherwise treat as playlist ID
	return `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistOrChannelId)}`;
}

/**
 * Fetches the RSS XML content and parses entries (video URL, title, published date).
 * Uses minimal string parsing to avoid extra dependencies.
 */
export async function fetchAndParseRssFeed(rssUrl: string): Promise<RssEntry[]> {
	const response = await fetch(rssUrl, { method: "GET" });
	if (!response.ok) {
		throw new Error(`Failed to fetch RSS feed: ${response.status}`);
	}
	const xml = await response.text();
	return parseYouTubeRss(xml);
}

function parseYouTubeRss(xml: string): RssEntry[] {
	// Split by <entry> blocks
	const entries: RssEntry[] = [];
	const parts = xml.split("<entry");
	for (let i = 1; i < parts.length; i++) {
		const chunk = parts[i];
		const entryXml = `<entry>${chunk}`;

		const title = matchTagText(entryXml, "title");
		const publishedRaw = matchTagText(entryXml, "published");
		const href = matchLinkHref(entryXml);

		if (!href) continue;
		const parsed = {
			videoUrl: href,
			title: title ?? href,
			publishedDate: parseIsoDate(publishedRaw),
		};
		entries.push(parsed);
	}
	return entries;
}

function matchTagText(xml: string, tag: string): string | null {
	const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
	const match = xml.match(regex);
	return match?.[1] ? decodeXml(match[1].trim()) : null;
}

function matchLinkHref(xml: string): string | null {
	// Prefer rel="alternate" href
	const relAlternate = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i);
	if (relAlternate?.[1]) return decodeXml(relAlternate[1]);
	// Fallback: any link href
	const anyHref = xml.match(/<link[^>]*href="([^"]+)"/i);
	return anyHref?.[1] ? decodeXml(anyHref[1]) : null;
}

function decodeXml(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function parseIsoDate(value: string | null): Date | null {
	if (!value) return null;
	const d = new Date(value);
	return isNaN(d.getTime()) ? null : d;
}

function safeParseUrl(value: string): URL | null {
	try {
		return new URL(value);
	} catch {
		return null;
	}
}
