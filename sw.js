// ⚙️ Sube esto en cada deploy para forzar actualización
const SW_VERSION = "2026-01-06-04";

const CACHE_NAME = `shell-${SW_VERSION}`;

// Rutas del “shell” (archivos estáticos).
// En GitHub Pages (/MiApp/) usamos rutas relativas y las resolvemos con self.location.
const SHELL_ASSETS = [
  "./", // navegación a la raíz de la app
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./apple-touch-icon.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Conjunto de URLs absolutas del shell (para comparar en fetch)
const SHELL_URLS = new Set(
  SHELL_ASSETS.map((p) => new URL(p, self.location).toString())
);

// URLs absolutas del index (fallback offline)
const INDEX_URL = new URL("./index.html", self.location).toString();
const ROOT_URL = new URL("./", self.location).toString();

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...SHELL_URLS]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Limpieza de caches antiguos
    const keys = await caches.keys();
    await Promise.all(
      keys
      .filter((k) => k.startsWith("shell-") && k !== CACHE_NAME)
      .map((k) => caches.delete(k))
    );
    
    await self.clients.claim();
  })());
});

// Listener de mensajes (fuera del fetch)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  
  // Solo controlamos lo que está dentro del scope/origen de tu app (evita cosas externas)
  const inScope =
    url.origin === self.location.origin &&
    url.pathname.startsWith(new URL("./", self.location).pathname);
  
  if (!inScope) return;
  
  // 1) Navegación: network-first, y si no hay red -> app shell (index)
  const isNavigation =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");
  
  if (isNavigation) {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(INDEX_URL)) || (await cache.match(ROOT_URL));
      }
    })());
    return;
  }
  
  // 2) SOLO assets del shell: cache-first
  const reqUrl = url.toString();
  if (!SHELL_URLS.has(reqUrl)) return;
  
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(reqUrl);
    if (cached) return cached;
    return fetch(req);
  })());
});