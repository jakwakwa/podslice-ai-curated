import { format, subYears } from "date-fns";
import { unstable_cache } from "next/cache";

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

// Internal fetcher function
async function fetchMarketStackData(symbol: string): Promise<ChartDataPoint[]> {
	if (!process.env.MARKET_STACK_KEY) {
		console.warn("MARKET_STACK_KEY is not defined");
		return [];
	}

	const dateFrom = format(subYears(new Date(), 1), "yyyy-MM-dd");
	const baseUrl = "http://api.marketstack.com/v1/eod";

	// Sanitize symbol: remove leading $ and trim whitespace
	const cleanSymbol = symbol.replace(/^\$/, "").trim();

	if (!cleanSymbol) {
		console.warn("getHistoricalPrices called with empty symbol");
		return [];
	}

	// console.log(`[MarketStack] Fetching historical prices for symbol: '${cleanSymbol}'`);

	const params = new URLSearchParams({
		access_key: process.env.MARKET_STACK_KEY,
		symbols: cleanSymbol,
		date_from: dateFrom,
		limit: "1000",
		sort: "ASC",
	});

	try {
		const res = await fetch(`${baseUrl}?${params.toString()}`, {
			next: { revalidate: 86400 }, // 24 hours
		});

		if (!res.ok) {
			console.error(`MarketStack API error: ${res.status} ${res.statusText}`);
			// const text = await res.text();
			// console.error("Response body:", text);
			return [];
		}

		const json: MarketStackResponse = await res.json();

		if (!(json.data && Array.isArray(json.data))) {
			console.warn("MarketStack API returned unexpected structure:", json);
			return [];
		}

		return json.data.map(item => ({
			day: format(new Date(item.date), "MMM d"),
			value: item.close,
		}));
	} catch (error) {
		console.error("Failed to fetch historical prices:", error);
		return [];
	}
}

// Aggressive caching wrapper
export const getHistoricalPrices = unstable_cache(
	async (symbol: string) => fetchMarketStackData(symbol),
	["marketstack-history-v1"],
	{
		revalidate: 86400, // 24 hours
		tags: ["marketstack"],
	}
);
