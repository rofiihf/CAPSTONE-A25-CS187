const CACHE_NAME = 'learning-buddy-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles/style.css',
  './scripts/index.js',
  './scripts/view/messageView.js',
  './scripts/presenter/messagePresenter.js',
  './scripts/model/messageModel.js',
  './scripts/components/bubbleChat.js',
  './scripts/data/dummy.js',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => {
            console.log('[SW] Removing old cache:', oldKey);
            return caches.delete(oldKey);
          }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === 'opaque'
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          return cachedResponse || Promise.reject(new Error('Network error and no cache.'));
        });
    }),
  );
});
