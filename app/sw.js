const CACHE = 'awsfc-m2b-1';
const ASSETS = [
  './','./index.html','./assets/app.css','./assets/icon.svg','./web-config.js',
  './js/app.js','./js/api.js','./js/auth.js','./js/config.js','./js/demo.js',
  './js/utils.js','./js/views.js','./js/zip.js','./manifest.webmanifest'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(fetch(event.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)); return r;
  }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html'))));
});
