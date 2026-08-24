const CACHE_NAME = 'offline-maps';
const STATIC_MAPS_CACHE = 'offline-maps-static';
const APP_CACHE_NAME = 'app-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE_NAME).then((cache) => {
      // Best effort caching for SPA shell.
      return cache.addAll(['/', '/index.html']).catch(() => console.warn('Could not precache SPA shell'));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept OpenStreetMap tile requests
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Try to find the tile in the cache
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, fetch from network
        try {
          // We don't cache on the fly here because we only want to store tiles downloaded intentionally by the user
          // via offlineMapService, to avoid ballooning cache size.
          return await fetch(event.request);
        } catch (_error) {
          // Network failed and tile not in cache.
          // Return a transparent 256x256 png or error response.
          return new Response('', {
            status: 404,
            statusText: 'Tile not cached for offline use.'
          });
        }
      })
    );
    return;
  }

  // Intercept Static Offline Maps
  if (url.pathname.startsWith('/offline-maps/')) {
    event.respondWith(
      caches.open(STATIC_MAPS_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        return fetch(event.request);
      })
    );
    return;
  }

  // SPA Navigation Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
  }
});
