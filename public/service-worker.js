const CACHE_NAME = 'vexora-pos-shell-v4'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        const response = await fetch('/')
        if (!response.ok) throw new Error('No se pudo preparar la aplicación para trabajar sin conexión.')
        await cache.put('/', response.clone())
        const html = await response.text()
        const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
          .map((match) => new URL(match[1], self.location.origin).href)
        await cache.addAll(assets)
      })
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('vexora-pos-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            await caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone()))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match('/')
          if (cached) return cached
          throw new Error('No hay una versión del POS guardada para abrir sin conexión.')
        }),
    )
    return
  }

  if (!/\.(?:js|css|png|svg|webp|woff2?)$/i.test(url.pathname)) return

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok) {
          await caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        }
        return response
      })
      .catch(async (error) => {
        const cached = await caches.match(request)
        if (cached) return cached
        throw error
      }),
  )
})
