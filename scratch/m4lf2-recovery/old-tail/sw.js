const CACHE = 'awsfc-m4lf2-v2';
const ASSETS = [
  './','./index.html','./assets/app.css','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./web-config.js',
  './js/app.js','./js/api.js','./js/auth.js','./js/config.js','./js/demo.js','./js/standalone.js','./js/vault.js',
  './js/knowledge.js','./js/cur-parser.js','./js/diagnostics.js','./js/utils.js','./js/views.js','./js/zip.js','./manifest.webmanifest',
  './data/pricing-snapshot.json'
];
const STATIC_URLS = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', event => event.waitUntil(Promise.all([
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  // OAuth callbacks and every navigation are network-first and are never stored
  // with query parameters. The cached app shell is the offline fallback.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, {cache: 'no-store'}).catch(() => caches.match('./index.html')));
    return;
  }
  // Explicit cache-busting (for pricing refresh) bypasses the static cache.
  if (url.search || !STATIC_URLS.has(url.href)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const copy=response.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)); return response;
  }).catch(() => caches.match(event.request)));
});
