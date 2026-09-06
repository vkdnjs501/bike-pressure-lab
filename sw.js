const CACHE_NAME = "ybpl-beta-4.2.1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./engine.js",
  "./presets.js",
  "./app.js",
  "./manifest.webmanifest",
  "./favicon-32.png",
  "./apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png",
  "./splash/ipad-pro-13-portrait.png",
  "./splash/ipad-pro-13-landscape.png"
];

const APP_ORIGIN = self.location.origin;
const INDEX_URL = new URL("./index.html", self.registration.scope).href;

function isSameOriginRequest(request) {
  return new URL(request.url).origin === APP_ORIGIN;
}

function isSafeCacheResponse(response) {
  return Boolean(response && response.ok && response.type === "basic");
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;

  // 외부 출처와 GET 이외 요청은 Service Worker가 가로채거나 캐시하지 않습니다.
  if (request.method !== "GET" || !isSameOriginRequest(request)) return;

  // HTML navigation: network-first, offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async response => {
          if (isSafeCacheResponse(response)) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(INDEX_URL, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(INDEX_URL))
    );
    return;
  }

  // Same-origin static resources: cached response first, safe background refresh.
  const networkUpdate = fetch(request)
    .then(async response => {
      if (isSafeCacheResponse(response)) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    });

  event.waitUntil(networkUpdate.then(() => undefined).catch(() => undefined));
  event.respondWith(
    caches.match(request).then(cached =>
      cached || networkUpdate.catch(() => cached)
    )
  );
});
