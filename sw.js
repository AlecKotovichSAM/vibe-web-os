
const CACHE = 'webos-cache-v2'; // Increment version to force cache update
const ASSETS = [
  './',
  './index.html',
  './css/os.css',
  './js/core.bus.js',
  './js/core.fs.js',
  './js/core.window.js',
  './js/core.apps.js',
  './js/core.folders.js',
  './js/core.shell.js',
  './js/apps.notes.js',
  './js/apps.editor.js',
  './js/apps.files.js',
  './js/apps.settings.js',
  './js/games/folder.js',
  './js/games/minesweeper.js',
  './js/boot.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

self.addEventListener('fetch', e=>{
  // Network-first strategy: try network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // If network request succeeds, cache it and return
        const responseToCache = response.clone();
        caches.open(CACHE).then(cache => {
          cache.put(e.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(e.request);
      })
  );
});
