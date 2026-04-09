const CACHE_NAME = 'relovetree-pwa-v5';

const PRECACHE_URLS = [
  '/index.html',
  '/assets/css/app.css',
  '/assets/css/app-base.css',
  '/assets/css/app-nav.css',
  '/assets/css/app-buttons.css',
  '/assets/css/app-modal.css',
  '/assets/css/app-feedback.css',
  '/assets/css/app-utils.css',
  '/assets/css/index.css',
  '/pages/editor.html',
  '/assets/css/editor-core.css',
  '/assets/css/editor-topbar.css',
  '/assets/css/editor-canvas.css',
  '/assets/css/editor-detail.css',
  '/assets/css/editor-ai.css',
  '/assets/css/editor-comments.css',
  '/assets/css/editor-timeline.css',
  '/assets/css/editor-responsive.css',
  '/pages/community.html',
  '/assets/css/community-layout.css',
  '/assets/css/community-cards.css',
  '/assets/css/community-detail.css',
  '/assets/css/community-comments.css',
  '/assets/css/community-forms.css',
  '/pages/owner.html',
  '/assets/css/owner.css',
  '/pages/admin.html',
  '/assets/css/admin.css',
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
