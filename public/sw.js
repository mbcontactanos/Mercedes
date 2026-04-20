const CACHE_NAME = "mercedes-ops-pwa-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET" || !isSameOrigin(requestUrl)) {
    return;
  }

  const isNavigationRequest =
    event.request.mode === "navigate" || event.request.destination === "document";
  const isStaticAsset =
    ["script", "style", "worker", "image", "font"].includes(event.request.destination) ||
    requestUrl.pathname.startsWith("/assets/");

  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", responseClone));
          return networkResponse;
        })
        .catch(async () => {
          const cachedDocument = await caches.match(event.request);
          return cachedDocument || caches.match("/index.html") || caches.match("/");
        }),
    );
    return;
  }

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);

        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      } catch {
        return Response.error();
      }
    }),
  );
});
