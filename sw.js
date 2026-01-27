const CACHE_NAME = 'iasd-limache-v2'; // <--- Cambia el número cada vez
const urlsToCache = ['./', './index.html'];

self.addEventListener('install', e => {
    // Esto obliga al nuevo Service Worker a tomar el control de inmediato
    self.skipWaiting(); 
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', e => {
    // Esto borra la versión vieja del celular
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});