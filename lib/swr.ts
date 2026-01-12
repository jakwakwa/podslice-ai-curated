import type { Middleware, SWRConfiguration } from "swr";

export const ONE_MINUTE = 60 * 1000;
export const ONE_HOUR = 60 * ONE_MINUTE; // 3_600_000
export const ONE_DAY = 24 * ONE_HOUR; // 86_400_000
export const SEVEN_DAYS = 7 * ONE_DAY; // 604_800_000

export async function defaultFetcher<T = unknown>(url: string): Promise<T> {
	const res = await fetch(url, {
		headers: { Accept: "application/json" },
		cache: "default",
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Request failed: ${res.status} ${text}`);
	}
	return (await res.json()) as T;
}

export const defaultSWRConfig: SWRConfiguration = {
	fetcher: defaultFetcher,
	revalidateOnFocus: false,
	revalidateOnReconnect: true,
	revalidateIfStale: false,
	dedupingInterval: ONE_MINUTE,
	keepPreviousData: true,
	errorRetryCount: 2,
	shouldRetryOnError: true,
};

// Optional placeholder for future logging or instrumentation
export const withLogging: Middleware = useSWRNext => (key, fetcher, config) => {
	return useSWRNext(key, fetcher, config);
};
