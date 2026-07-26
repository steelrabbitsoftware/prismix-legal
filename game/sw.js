// Service worker: jogo 100% offline (cache-first)
const CACHE = 'travel-heros-v3';
const ASSETS = [
  '.', 'index.html', 'app.html', 'dist/bundle.js', 'manifest.webmanifest',
  'js/main.js', 'js/engine.js', 'js/sprites.js', 'js/audio.js', 'js/save.js',
  'js/data.js', 'js/menu.js', 'js/charselect.js', 'js/combat.js', 'js/base.js', 'js/results.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (e.request.method === 'GET' && res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
