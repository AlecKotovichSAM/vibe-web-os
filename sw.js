
const CACHE = 'webos-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './css/os.css',
  './js/core.bus.js',
  './js/core.fs.js',
  './js/core.window.js',
  './js/core.apps.js',
  './js/core.shell.js',
  './js/apps.notes.js',
  './js/apps.files.js',
  './js/apps.settings.js',
  './js/boot.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
