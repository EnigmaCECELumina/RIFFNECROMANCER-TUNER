/* RiffNecromancer service worker — offline shell caching */
const SW_VERSION = "riffnec-v1";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

const SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => null)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => !n.startsWith(SW_VERSION))
          .map((n) => caches.delete(n)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never intercept API/backend or POST-like operations
  if (url.pathname.startsWith("/api/")) return;
  // Never cache OAuth or hot-reload assets
  if (url.pathname.startsWith("/sockjs-node") || url.hostname.includes("emergentagent.com/auth")) return;

  // Navigation requests: network-first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/"))),
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (url.origin === self.location.origin && /(\.js|\.css|\.svg|\.png|\.woff2?|\.json)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((resp) => {
            if (resp.ok) {
              const clone = resp.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
            }
            return resp;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
