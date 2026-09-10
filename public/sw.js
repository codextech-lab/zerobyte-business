const CACHE_NAME = 'zerobyte-shell-v2'
const APP_SHELL = ['/', '/admin.html', '/manifest.webmanifest', '/site.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  // Never cache or synthesize responses for Supabase/private API requests.
  if (!event.request.url.startsWith(self.location.origin)) return
  const pathname = event.request.url.slice(self.location.origin.length)
  if (/^\/(rest|auth|functions|storage)(\/|$)/.test(pathname)) return
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => {
      const fallback = event.request.url.endsWith('/admin.html') || event.request.url.endsWith('/admin') ? '/admin.html' : '/'
      return caches.match(event.request).then((response) => response || caches.match(fallback))
    }))
    return
  }
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && ['script', 'style', 'font', 'image'].includes(event.request.destination)) {
      const copy = response.clone()
      void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
    }
    return response
  }).catch(() => caches.match(event.request)))
})
