const CACHE_NAME = "branserv-v4-pwa-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./produits.html",
  "./services.html",
  "./panier.html",
  "./commande.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./style.css",
  "./app.js",
  "./language-v4.js",
  "./theme-button-v4.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, copy);
        });

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// BRANSERV : réception des notifications Web Push
self.addEventListener("push", event => {
  let data = {
    title: "BRANSERV — Nouvelle commande",
    body: "Une nouvelle commande nécessite votre attention.",
    url: "./admin.html"
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (_) {
      data.body = event.data.text() || data.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      data: { url: data.url || "./admin.html" },
      tag: data.tag || "branserv-notification"
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil((async () => {
    const target = new URL(
      event.notification.data?.url || "./admin.html",
      self.registration.scope
    ).href;

    const clientsList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clientsList) {
      if (client.url === target && "focus" in client) {
        await client.focus();
        return;
      }
    }

    await self.clients.openWindow(target);
  })());
});
