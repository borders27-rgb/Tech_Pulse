
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('techpulse-v1').then(cache => cache.addAll([
    './', './index.html',
    './assets/css/styles.css',
    './assets/js/main.js',
    './assets/js/store.js',
    './assets/js/analyzers.js',
    './assets/js/connectors.js',
    './assets/js/ui.js',
    './assets/js/mock_data.js'
  ])));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
