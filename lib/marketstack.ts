import { format, subYears } from "date-fns";

export interface ChartDataPoint {
	day: string;
	value: number;
}

interface MarketStackEodData {
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	adj_high: number | null;
	adj_low: number | null;
	adj_close: number | null;
	adj_open: number | null;
	adj_volume: number | null;
	split_factor: number;
	dividend: number;
	symbol: string;
	exchange: string;
	date: string;
}

interface MarketStackResponse {
	pagination: {
		limit: number;
		offset: number;
		count: number;
		total: number;
	};
	data: MarketStackEodData[];
}

export async function getHistoricalPrices(symbol: string): Promise<ChartDataPoint[]> {
	if (!process.env.MARKET_STACK_KEY) {
		console.warn("MARKET_STACK_KEY is not defined");
		return [];
	}

	const dateFrom = format(subYears(new Date(), 1), "yyyy-MM-dd");

	// MarketStack free tier does not support HTTPS consistently on some endpoints,
	// but standard documentation suggests http is safer for free tier or use https if paid.
	// We will try http to avoid SSL issues on broad tiers unless specified otherwise.
	// However, usually API clients should default to HTTPS.
	// The user specifically linked docs which show https example but let's stick to standard practice.
	// If it fails we can adjust.
	// Actually, most modern fetch implementations require HTTPS or allow HTTP.
	// We'll use http as per plan note to be safe for free tier limits if applicable,
	// or standard https if possible.
	// Let's use http based on common free-tier restrictions for APILayer services if keys are free.
	const baseUrl = "http://api.marketstack.com/v1/eod";

	// Sanitize symbol: remove leading $ and trim whitespace
	const cleanSymbol = symbol.replace(/^\$/, "").trim();

	if (!cleanSymbol) {
		console.warn("getHistoricalPrices called with empty symbol");
		return [];
	}

	console.log(`[MarketStack] Fetching historical prices for symbol: '${cleanSymbol}'`);

	const params = new URLSearchParams({
		access_key: process.env.MARKET_STACK_KEY,
		symbols: cleanSymbol,
		date_from: dateFrom,
		limit: "1000",
		sort: "ASC",
	});

	try {
		const res = await fetch(`${baseUrl}?${params.toString()}`, {
			next: { revalidate: 3600 * 24 }, // Cache for 24 hours
		});

		if (!res.ok) {
			console.error(`MarketStack API error: ${res.status} ${res.statusText}`);
			const text = await res.text();
			console.error("Response body:", text);
			return [];
		}

		const json: MarketStackResponse = await res.json();

		if (!(json.data && Array.isArray(json.data))) {
			console.warn("MarketStack API returned unexpected structure:", json);
			return [];
		}

		return json.data.map(item => ({
			day: format(new Date(item.date), "MMM d"), // e.g. "Jan 12"
			value: item.close,
		}));
	} catch (error) {
		console.error("Failed to fetch historical prices:", error);
		return [];
	}
}
