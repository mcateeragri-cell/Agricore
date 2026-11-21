const CACHE = "agricore-shell-v2";
const SHELL = [
  "/technician",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          void caches
            .open(CACHE)
            .then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(async () =>
        (await caches.match(request)) || (await caches.match("/technician")),
      ),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "agricore-offline-sync") return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "AGRICORE_SYNC_REQUESTED" });
        });
      }),
  );
});

self.addEventListener("push", event => {
  let data = {}; try { data = event.data?.json() || {}; } catch {}
  event.waitUntil(self.registration.showNotification(String(data.title || "AgriCore notification"), {
    body: String(data.body || "You have an update requiring attention.").slice(0,180),
    icon: "/icons/icon-192.png",
    data: { url: "/dashboard" }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/dashboard"));
});
