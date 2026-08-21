const CACHE_NAME = 'suivi-crypto-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install : mise en cache des fichiers de l'app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate : nettoyage des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : network-first pour HTML, cache-first pour le reste de l'app.
// Les requêtes cross-origin (API de prix, RPC on-chain, CDN) ne sont jamais
// interceptées : elles doivent toujours aller au réseau pour rester "en direct".
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  const isHTML = e.request.destination === 'document' ||
                 e.request.url.endsWith('index.html') ||
                 e.request.url.endsWith('/');

  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
