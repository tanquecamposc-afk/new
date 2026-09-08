/* Service worker de NEXO IA.
   Cachea el armazón de la app para poder abrirla sin conexión.
   Las llamadas a la API nunca se cachean: siempre van a la red. */
const CACHE = "nexo-ia-v1";
const ARMAZON = ["./", "./index.html", "./manifest.webmanifest", "./icono.svg"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARMAZON)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const url = new URL(ev.request.url);
  // Solo se sirve desde caché lo propio de la app, y nunca peticiones POST.
  if(ev.request.method !== "GET" || url.origin !== location.origin) return;

  // Red primero para tener siempre la última versión; caché como respaldo.
  ev.respondWith(
    fetch(ev.request)
      .then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(ev.request, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(ev.request).then(r => r || caches.match("./index.html")))
  );
});
