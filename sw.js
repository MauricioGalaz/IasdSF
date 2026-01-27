const CACHE_NAME = 'iasd-limache-v2.1'; // Incrementado para forzar actualización
const urlsToCache = [
  './',
  './index.html',
  // Asegúrate de agregar aquí tus archivos .css y .js si tienen nombres específicos
];

self.addEventListener('install', e => {
    self.skipWaiting(); 
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto correctamente');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Borrando caché antiguo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request)
            .then(res => res || fetch(e.request))
            .catch(() => caches.match('./index.html')) // Fallback offline
    );
});