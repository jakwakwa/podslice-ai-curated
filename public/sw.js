const CACHE_NAME = "podslice-cache-v1";
const PRECACHE_URLS = ["/", "/offline.html", "/manifest.json", "/icon.png", "/logo-icon.png", "/favicon.svg"];

const RUNTIME_CACHE = "podslice-runtime";

// Install - precache core assets
self.addEventListener("install", event => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(CACHE_NAME).then(cache => {
			return cache.addAll(PRECACHE_URLS);
		})
	);
});

// Activate - cleanup old caches
self.addEventListener("activate", event => {
	const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.map(cacheName => {
					if (!currentCaches.includes(cacheName)) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	self.clients.claim();
});

// Fetch - network first for navigation, cache-first for others with runtime caching
self.addEventListener("fetch", event => {
	const { request } = event;
	// Only handle GET requests
	if (request.method !== "GET") return;

	const url = new URL(request.url);

	// For navigation requests, try network first, then fallback to cache (offline page)
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then(response => {
					// If we got a response, optionally update the cache
					const copy = response.clone();
					caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
					return response;
				})
				.catch(() => caches.match("/offline.html"))
		);
		return;
	}

	// For same-origin resources (assets), use cache-first then network
	if (url.origin === self.location.origin) {
		event.respondWith(
			caches.match(request).then(cachedResponse => {
				if (cachedResponse) return cachedResponse;
				return fetch(request)
					.then(networkResponse => {
						const copy = networkResponse.clone();
						caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
						return networkResponse;
					})
					.catch(() => {
						// If request is for an image, return placeholder
						if (request.destination === "image") {
							return caches.match("/logo-icon.png");
						}
					});
			})
		);
	}
});
