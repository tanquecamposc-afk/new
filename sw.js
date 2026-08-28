/* NEXO ARCADE — service worker: la web queda jugable sin conexión. */
const VER = 'nexo-arcade-v1';
const CORE = [
  './', './index.html',
  './assets/css/base.css', './assets/css/layout.css',
  './assets/css/components.css', './assets/css/player.css',
  './assets/js/engine/math.js', './assets/js/engine/gfx.js',
  './assets/js/engine/audio.js', './assets/js/engine/input.js',
  './assets/js/engine/fx.js', './assets/js/engine/ui.js',
  './assets/js/engine/core.js',
  './assets/js/platform/catalog.js', './assets/js/platform/cover.js',
  './assets/js/platform/motifs-a.js', './assets/js/platform/motifs-b.js',
  './assets/js/platform/motifs-c.js', './assets/js/platform/lexicon.js',
  './assets/js/platform/store.js',
  './assets/js/platform/dom.js', './assets/js/platform/views.js',
  './assets/js/platform/player.js', './assets/js/platform/app.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* tipografías: las gestiona el navegador */

  /* Navegación: red primero, con la copia guardada como red de seguridad. */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  /* Resto: caché primero y actualización en segundo plano. */
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(VER).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
