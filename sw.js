// Service worker: guarda la app para abrirla sin conexión; tarifas con red primero.
const VERSION = "peajes-v3";
const APP = [
  "./", "index.html", "css/app.css", "js/app.js", "js/calc.js", "manifest.webmanifest",
  "vendor/leaflet.js", "vendor/leaflet.css", "vendor/images/marker-icon.png", "vendor/images/marker-shadow.png",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "data/tarifas.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // mapas, rutas y búsquedas van directo a la red
  if (url.pathname.endsWith("/data/tarifas.json")) {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
