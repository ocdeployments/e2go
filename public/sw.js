const CACHE_NAME = 'e2go-v2';
const OFFLINE_URL = '/';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first for API, cache first for static assets only
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept navigation requests — let the browser handle page loads directly.
  // Intercepting navigate mode in Next.js dev (and prod) causes fetch failures because
  // SSR responses aren't safely cloneable/cacheable in a SW context.
  if (request.mode === 'navigate') {
    return;
  }

  // Network first for API routes and Supabase
  if (url.pathname.startsWith('/api/') || url.host.includes('supabase')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Skip Next.js internal chunks — they are versioned and must never be served stale
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // Cache first only for explicit static assets (images, fonts, manifest, icons)
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
