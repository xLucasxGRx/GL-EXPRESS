/**
 * ==========================================================================
 * GL EXPRESS — Service Worker para Modo Offline & PWA
 * ==========================================================================
 */

const CACHE_NAME = 'glexpress-mayorista-v3.0';

// Lista de activos estáticos con rutas relativas compatibles con GitHub Pages
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './favicon.ico',
  './assets/favicon.ico',
  './assets/favicon-32x32.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png'
];

// Instalación: Precarga de recursos en la caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[GL EXPRESS SW] Precaching de activos');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[GL EXPRESS SW] Fallo en precaching de algún recurso:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpieza de cachés anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[GL EXPRESS SW] Limpiando caché anterior:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Manejo inteligente de peticiones para funcionamiento 100% offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
