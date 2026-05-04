const CACHE_NAME = "ponpon-hanabi-ehon-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/icon-maskable-512.png"
];
const CACHEABLE_EXTENSIONS = [".html", ".js", ".css", ".png", ".svg", ".webmanifest"];
const APP_SHELL_URLS = new Set(APP_SHELL.map((url) => new URL(url, self.location.href).href));

function shouldCacheRequest(request) {
  const url = new URL(request.url);
  if (APP_SHELL_URLS.has(url.href)) {
    return true;
  }
  return url.origin === self.location.origin
    && CACHEABLE_EXTENSIONS.some((extension) => url.pathname.endsWith(extension));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
        } catch (_error) {
          // Project-page hosting can make "/" unavailable; cache the scoped files that exist.
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      if (response && response.ok && shouldCacheRequest(request)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      if (request.mode === "navigate") {
        return caches.match("./index.html").then((cachedIndex) => {
          if (cachedIndex) {
            return cachedIndex;
          }
          return caches.match("./").then((cachedRoot) => cachedRoot || Response.error());
        });
      }
      return Response.error();
    }))
  );
});
