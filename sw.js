// Haushaltsbuch 2026 — Service Worker
'use strict';

const CACHE_NAME = 'hb2026-v5';
const APP_SHELL = ['./haushaltsbuch.html', './manifest.json', './icon.svg', './pdf.min.js', './pdf.worker.min.js'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:' || url.origin !== self.location.origin) return;

  const isShell = APP_SHELL.some(f => event.request.url.endsWith(f.replace('./', '/')));
  if (isShell || url.pathname === '/' || url.pathname.endsWith('haushaltsbuch.html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request).then(res => {
          if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)); }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(res => { if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)); } return res; })
      .catch(() => caches.match(event.request))
  );
});
