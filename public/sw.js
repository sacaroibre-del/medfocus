const CACHE_NAME = 'medfocus-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if(k !== CACHE_NAME) return caches.delete(k); })
    ))
  );
});

self.addEventListener('fetch', (e) => {
  // Network-First strategy
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
