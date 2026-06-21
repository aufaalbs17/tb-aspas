const CACHE_NAME = 'trans-padang-v13';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/map',
  '/map.html',
  '/admin',
  '/admin.html',
  '/public/css/style.css',
  '/public/js/map.js',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-ant-path@1.3.0/dist/leaflet-ant-path.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => console.error('Cache install error', err))
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', function(e) {
  const url = new URL(e.request.url);

  // API Requests: Network First
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).then(response => {
        const resClone = response.clone();
        caches.open('api-cache').then(cache => cache.put(e.request, resClone));
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML Requests (Pages): Network First, fallback to cache
  // This prevents the issue where UI updates are stuck in cache
  if (e.request.mode === 'navigate' || e.request.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(e.request).then(response => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        return response;
      }).catch(() => caches.match(e.request).then(res => res || caches.match('/index.html')))
    );
    return;
  }

  // Other Static Assets (JS, CSS, Images): Cache First, fallback to Network
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, fetchRes.clone());
          return fetchRes;
        });
      });
    }).catch(() => {
      // Ignore
    })
  );
});
