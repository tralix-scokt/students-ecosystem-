/* E-Learning Ecosystem — Progressive Web App Service Worker */
const CACHE_NAME = "e-learning-ecosystem-pwa-v1";
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/brand/logo-icon-192.png",
  "/brand/logo-icon-512.png",
];

const INLINE_OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#020614" />
  <title>Offline — E-Learning Ecosystem</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020614;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}
    .card{max-width:420px;border:1px solid rgba(0,229,255,.28);background:rgba(10,18,40,.92);border-radius:24px;padding:32px 24px;box-shadow:0 20px 50px rgba(0,0,0,.6)}
    .badge{display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(0,229,255,.12);border:1px solid rgba(0,229,255,.35);color:#67e8f9;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
    h1{margin:16px 0 8px;font-size:22px}
    p{margin:0 0 22px;color:#94a3b8;font-size:14px;line-height:1.6}
    button{background:#00e5ff;color:#020614;border:none;border-radius:14px;padding:12px 22px;font-weight:700;font-size:14px;cursor:pointer}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Offline Mode</span>
    <h1>You're currently offline</h1>
    <p>Check your internet connection to sync your latest courses, AI Tutor responses, and CBT past questions.</p>
    <button onclick="window.location.reload()">Try Reconnecting</button>
  </div>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: "reload" }).then((response) => {
              if (response.ok) {
                return cache.put(url, response);
              }
              return undefined;
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("e-learning-ecosystem-pwa-") &&
                key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (
    request.cache === "only-if-cached" &&
    request.mode !== "same-origin"
  ) {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only handle same-origin requests; never intercept API, Auth, or RSC data mutations
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Navigation requests: Network-first, falling back to cached /offline only when offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedOffline = await caches.match("/offline");
        if (cachedOffline) return cachedOffline;
        return new Response(INLINE_OFFLINE_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })
    );
    return;
  }

  // Immutable static assets & brand icons: Cache-first with background refresh
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/manifest.webmanifest";

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkPromise;
      })
    );
  }
});
