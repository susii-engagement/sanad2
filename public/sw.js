
const VERSION = 'sli-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const immutable = (url) =>
  /\/(models|mediapipe|runtime|clips|assets)\//.test(url.pathname) ||
  url.host.includes('fonts.g');

self.addEventListener('fetch', (e) => {
  const req = e.request;

  if (req.method !== 'GET' || req.headers.has('range')) return;

  const url = new URL(req.url);

  if (immutable(url)) {
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;

        const res = await fetch(req);

        if (res.ok) {
          const copy = res.clone();
          e.waitUntil(cache.put(req, copy));
        }

        return res;
      })
    );
  } else if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();

            e.waitUntil(
              caches.open(VERSION)
                .then((cache) => cache.put(req, copy))
                .catch(() => {})
            );
          }

          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
