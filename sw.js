const CACHE_NAME = 'relovetree-pwa-v1';

const PRECACHE_URLS = [
  '/index.html',
  '/output.css',
  '/index.js',
  '/src/shared.js',
  '/src/auth.js',
  '/src/payment.js',
  '/editor.html',
  '/editor_ai.js',
  '/community.html',
  '/community.js',
  '/owner.html',
  '/owner.js',
  '/admin.html',
  '/admin.js',
  '/admin.css',
  '/login.html',
  '/manifest.webmanifest',
  '/pwa-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const dest = request.destination || '';
  const isNavigate = request.mode === 'navigate' || dest === 'document';

  if (!isNavigate && !['script', 'style', 'image', 'font', 'manifest'].includes(dest)) {
    return;
  }

  if (isNavigate) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
