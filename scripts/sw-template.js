// Service worker template. The vite plugin in vite.config.ts fills in VERSION and PRECACHE at build time.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = `dsa-studio-shell-${VERSION}`;
const CONTENT = 'dsa-studio-content'; // survives app updates; refreshed in the background

self.addEventListener('install', (e) => {
  // No skipWaiting here: the page shows "New version available" and the user decides when to reload.
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dsa-studio-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.includes('/content/')) {
    // stale-while-revalidate
    e.respondWith(
      caches.open(CONTENT).then(async (cache) => {
        const hit = await cache.match(req, { ignoreVary: true });
        const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => hit);
        return hit ?? net;
      }),
    );
    return;
  }

  // app shell: cache first, fill from the network; navigations fall back to the cached page
  e.respondWith(
    // ignoreVary: module scripts send an Origin header the install-time fetches did not, so Vary: Origin would miss
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit ??
      fetch(req).then((r) => {
        if (r.ok) caches.open(SHELL).then((c) => c.put(req, r.clone()));
        return r;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});
