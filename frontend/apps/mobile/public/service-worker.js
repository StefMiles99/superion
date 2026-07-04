const CACHE_NAME = 'superion-mobile-v1';
const PHOTO_SYNC_TAG = 'photo-queue-sync';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request);
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          void cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return cached ?? Response.error();
      }
    }),
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === PHOTO_SYNC_TAG) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'photo-queue-sync' });
        }
      }),
    );
  }
});
