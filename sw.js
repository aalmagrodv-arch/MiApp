// ⚙️ Bump this on every deploy to force update:
const SW_VERSION = "2026-01-05-01";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // Por ahora no cacheamos nada
});