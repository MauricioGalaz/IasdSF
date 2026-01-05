self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("fetch", () => {});

self.addEventListener("install", e => {
    e.waitUntil(
    caches.open("iasd-v1").then(cache => {
        return cache.addAll([
        "/",
        "/index.html",
        "/avisos.html",
        "/cronograma.html",
        "/contactoaviso.html"
        ]);
    })
    );
});

self.addEventListener("fetch", e => {
    e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
    );
});

