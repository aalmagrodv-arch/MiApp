// ⚙️ Sube esto en cada deploy para forzar actualización
const SW_VERSION = "2026-01-06-01";

const CACHE_NAME = `shell-${SW_VERSION}`;

// Rutas del “shell” (archivos estáticos). Ojo: con GitHub Pages en /MiApp/,
// usamos URLs relativas y las resolvemos con self.location.
const SHELL_ASSETS = [
  "./", // importante: para navegación a la raíz de la app
  "./index.html",
  "./manifest.json",
  "./apple-touch-icon.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const urls = SHELL_ASSETS.map(p => new URL(p, self.location).toString());
    await cache.addAll(urls);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Limpieza de caches antiguos
    const keys = await caches.keys();
    await Promise.all(
      keys
      .filter(k => k.startsWith("shell-") && k !== CACHE_NAME)
      .map(k => caches.delete(k))
    );
    
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  
  // Solo controlamos lo que está dentro del scope de tu app (evita cosas externas)
  const inScope = url.origin === self.location.origin &&
    url.pathname.startsWith(new URL("./", self.location).pathname);
  
  if (!inScope) return;
  
  // 1) Navegación (cuando abres la app o cambias “pantalla”): responde con app shell si no hay red
  const isNavigation = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");
  
  if (isNavigation) {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(new URL("./index.html", self.location).toString());
      }
    })());
    return;
  }
  
  // 2) Assets del shell: cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    
    // Si no está en cache, intenta red (y no caches “cosas raras”)
    return fetch(req);
  })());
});