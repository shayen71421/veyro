const CACHE = "veyro-shell-v7";
const SHELL = ["/", "/login/", "/register/", "/home/", "/explore/", "/scan/", "/journeys/", "/passport/", "/passport/share/", "/leaderboard/", "/profile/", "/manifest.webmanifest", "/favicon.ico", "/logo.png", "/icons/icon-192.png", "/icons/icon-512.png"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(async (response) => {
    const url = new URL(event.request.url);
    if (response.ok && (url.pathname.startsWith("/_next/static/") || SHELL.includes(url.pathname))) {
      const copy = response.clone();
      await caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))));
});
