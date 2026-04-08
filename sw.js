const CACHE_NAME = 'relovetree-pwa-v4';

const PRECACHE_URLS = [
  '/index.html',
  '/assets/css/app.css',
  '/assets/css/index.css',
  '/src/entries/index.js',
  '/src/shared-utils.js',
  '/src/shared.js',
  '/src/auth.js',
  '/src/payment.js',
  '/pages/editor.html',
  '/src/entries/editor_ai.js',
  '/src/editor-page-init.js',
  '/pages/community.html',
  '/src/entries/community.js',
  '/assets/css/community-layout.css',
  '/assets/css/community-cards.css',
  '/assets/css/community-detail.css',
  '/assets/css/community-comments.css',
  '/assets/css/community-forms.css',
  '/pages/owner.html',
  '/src/entries/owner.js',
  '/assets/css/owner.css',
  '/pages/admin.html',
  '/src/entries/admin.js',
  '/assets/css/admin.css',
  '/assets/css/editor-core.css',
  '/assets/css/editor-topbar.css',
  '/assets/css/editor-canvas.css',
  '/assets/css/editor-detail.css',
  '/assets/css/editor-detail-layout.css',
  '/assets/css/editor-detail-form.css',
  '/assets/css/editor-detail-content.css',
  '/assets/css/editor-ai.css',
  '/assets/css/editor-comments.css',
  '/assets/css/editor-timeline.css',
  '/assets/css/editor-responsive.css',
  '/pages/login.html',
  '/assets/css/login.css',
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
