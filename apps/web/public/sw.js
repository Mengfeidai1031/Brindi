/*
 * Brindi - Service Worker (base PWA).
 * Estrategia: cache-first para estáticos inmutables, network-first
 * con fallback para navegaciones. El soporte offline completo de los
 * quizzes de DECIDE llega en su incremento.
 */
const VERSION = 'brindi-sw-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brindi — sin conexión</title><style>body{font-family:system-ui,sans-serif;background:#faf4e8;color:#173f3b;display:grid;min-height:100dvh;place-items:center;margin:0;padding:24px;text-align:center}p{color:#57726c}</style></head><body><div><h1>Sin conexión · Offline</h1><p>Vuelve a intentarlo cuando tengas internet.<br>Try again when you're back online.</p></div></body></html>`;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Estáticos con hash e iconos: cache-first.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/branding/')
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, res.clone());
        }
        return res;
      })(),
    );
    return;
  }

  // Navegaciones: red primero, caché después, página offline al final.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(PAGES_CACHE);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cached = await caches.match(req);
          return (
            cached ??
            new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
          );
        }
      })(),
    );
  }
});
