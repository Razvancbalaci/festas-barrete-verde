import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA: rotas desconhecidas → index.html
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//, /^\/supabase\//],
  })
)

self.addEventListener('push', (event) => {
  const origin = self.location.origin
  let payload = {
    title: 'Barrete Verde',
    body: 'Nova actualização das festas.',
    url: '/',
  }

  try {
    if (event.data) {
      const data = event.data.json()
      payload = { ...payload, ...data }
    }
  } catch {
    try {
      const text = event.data?.text()
      if (text) payload.body = text
    } catch {
      /* ignore */
    }
  }

  // Android/Chrome exige notificação visível em cada push; ícones absolutos evitam falhas.
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Barrete Verde', {
      body: payload.body || '',
      icon: `${origin}/icon-192.png`,
      badge: `${origin}/icon-192.png`,
      tag: 'fbv-push',
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: payload.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
