const CACHE_NAME = "yae-manga-cache-v1";
const STATIC_ASSETS = ["/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key.startsWith("yae-manga-cache-") && key !== CACHE_NAME) return caches.delete(key);
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and non-http protocols
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

  // Cache only the explicitly listed static assets; images and API stay network-managed.
  if (url.origin === self.location.origin && STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});
