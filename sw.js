// ===========================================
// sw — Service Worker para caché offline
// ===========================================

// --- Constantes ---
const CACHE_NAME = 'niqi-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './db.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
];

// --- Evento: Install ---
// Cachea todos los recursos estáticos en la primera visita
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Activar inmediatamente sin esperar a que se cierren pestañas
  self.skipWaiting();
});

// --- Evento: Activate ---
// Limpia caches antiguos cuando se despliega una nueva versión
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
  // Tomar control de todas las pestañas abiertas
  self.clients.claim();
});

// --- Evento: Fetch ---
// Estrategia: Cache First, Network Fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
