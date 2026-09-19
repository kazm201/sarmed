const CACHE_NAME = 'sarmed-supermarket-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './favicon.ico',
  './pwa-192x192.png',
  './pwa-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.info('SW: skipped pre-caching asset:', asset);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass non-GET requests directly
  if (event.request.method !== 'GET') return;

  // Let firestore / api network requests handle their own offline persistence
  const url = event.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('identitytoolkit') ||
    url.includes('google-analytics')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in background (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(async () => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match('./index.html')) ||
            (await cache.match('index.html')) ||
            (await cache.match('./')) ||
            (await cache.match('/'))
          );
        }
      });
    })
  );
});

// Support Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'إشعار جديد', body: 'لديك حركة جديدة في النظام' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'إشعار جديد', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: './icon.svg',
    badge: './icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: './'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
