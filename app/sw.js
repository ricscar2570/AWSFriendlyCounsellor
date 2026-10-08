const CACHE = 'awsfc-m3r-2';
const ASSETS = [
  './','./index.html','./assets/app.css','./assets/icon.svg','./web-config.js',
  './js/app.js','./js/api.js','./js/auth.js','./js/config.js','./js/demo.js','./js/standalone.js','./js/vault.js',
  './js/utils.js','./js/views.js','./js/zip.js','./manifest.webmanifest'
];
const STATIC_URLS = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // OAuth authorization-code callbacks arrive as navigations with ?code=&state=.
  // Never persist those query-bearing requests in Cache Storage. Navigation
  // fallback uses the already-cached shell only when the network is unavailable.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, {cache: 'no-store'}).catch(() => caches.match('./index.html')));
    return;
  }
  if (url.search || !STATIC_URLS.has(url.href)) return;

  event.respondWith(fetch(event.request).then(response => {
    const copy=response.clone();
    caches.open(CACHE).then(c => c.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});
