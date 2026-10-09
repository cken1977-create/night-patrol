const V = 'np-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'vendor/phaser.min.js', 'src/audio.js', 'src/data.js', 'src/art.js', 'src/title.js', 'src/game.js', 'src/ui.js', 'src/main.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
// network-first so updates arrive, cache fallback so it works offline
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request))); });
