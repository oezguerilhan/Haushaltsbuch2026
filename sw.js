// Haushaltsbuch 2026 — Service Worker
'use strict';

const CACHE_NAME = 'hb2026-v3';
const APP_SHELL = [
  './haushaltsbuch.html', './manifest.json', './icon.svg',
  './js/app.js', './js/constants.js', './js/utils.js', './js/db.js',
  './js/state.js', './js/modal.js', './js/charts.js', './js/router.js',
  './js/views/dashboard.js', './js/views/transactions.js',
  './js/views/recurring.js', './js/views/charts.js',
  './js/views/import.js', './js/views/settings.js',
  './js/forms/transaction.js', './js/forms/batch.js', './js/forms/split.js'
];

// Install: Cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: CacheFirst for app shell, NetworkFirst for WebDAV/API requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for WebDAV (Nextcloud) and external requests
  if (
    event.request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.origin !== self.location.origin
  ) {
    return; // Let browser handle it
  }

  // CacheFirst for app shell files
  const isShell = APP_SHELL.some(f => event.request.url.endsWith(f.replace('./', '/')));
  if (isShell || url.pathname === '/' || url.pathname.endsWith('haushaltsbuch.html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Default: NetworkFirst with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
