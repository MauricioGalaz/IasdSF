const CACHE_NAME = 'iasd-limache-v2026';

// Archivos que se guardan para modo offline (solo lo esencial)
const urlsToCache = [
    './',
    './index.html',
    './imagenes/logo.jpg'
];

// Instalación: Guardar archivos base
self.addEventListener('install', event => {
    event.waitUntil(
    caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Fuerza al nuevo SW a tomar el control
    );
});

// Activación: Limpiar cachés viejos
self.addEventListener('activate', event => {
    event.waitUntil(
    caches.keys().then(cacheNames => {
        return Promise.all(
        cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
            }
        })
        );
    })
    );
});

// ESTRATEGIA: NETWORK FIRST (Prioriza Internet para ver cambios de Netlify)
self.addEventListener('fetch', event => {
    event.respondWith(
    fetch(event.request)
        .then(response => {
        // Si hay internet, clonamos la respuesta y la guardamos en caché
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, resClone);
        });
        return response;
        })
        .catch(() => {
        // Si NO hay internet, sacamos lo que tengamos en el caché
        return caches.match(event.request);
        })
    );
});