/* ResQLink service worker: the app shell opens with no connection. API traffic is never cached or intercepted,
   so no personal or incident data is stored by the worker. Bump VERSION to invalidate old caches. */
const VERSION = 'resqlink-shell-v1'
const SHELL = ['/', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return
  if (req.mode === 'navigate') {
    // Network first so a deploy is picked up immediately; fall back to the cached shell when offline.
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('/', copy)); return r }).catch(() => caches.match('/')))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    // Hashed, immutable build files: cache first.
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)) } return r })))
  }
})
