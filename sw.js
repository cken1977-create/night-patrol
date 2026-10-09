// Night Patrol service worker: precache everything, then serve cache-first
// (fast + reliable on flaky storm-time connections), refreshing in the background.
const V = 'np-v3';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'vendor/phaser.min.js', 'src/audio.js', 'src/data.js', 'src/art.js', 'src/title.js', 'src/game.js', 'src/ui.js', 'src/main.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.postMessage({ type: 'np-cached' }))));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url); if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    const hit = await c.match(e.request, { ignoreSearch: true }) || (e.request.mode === 'navigate' ? await c.match('index.html') : null);
    const net = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Offline', { status: 503 });
  })());
});
