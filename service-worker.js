const CACHE_NAME = "task-timeboxing-firebase-v5";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/favicon-64-v4.png",
  "/icons/apple-touch-icon-v4.png",
  "/icons/logo-96-v4.png",
  "/icons/icon-192-v4.png",
  "/icons/icon-512-v4.png",
  "/icons/icon-maskable-192-v4.png",
  "/icons/icon-maskable-512-v4.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  const trustedFirebaseModule = url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/12.18.0/");
  if (request.method !== "GET" || (url.origin !== self.location.origin && !trustedFirebaseModule)) {
    return;
  }

  if (url.origin === self.location.origin && url.pathname === "/firebase-config.js") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
      const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
      return existing ? existing.focus() : self.clients.openWindow("/");
    })
  );
});
