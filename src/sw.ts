/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// Precache all assets built by Vite
precacheAndRoute(self.__WB_MANIFEST)

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data: { title?: string; body?: string; icon?: string; badge?: string; url?: string }
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Anti-Planning', body: event.data.text() }
  }

  const options: NotificationOptions & { vibrate?: number[] } = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Anti-Planning', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = event.notification.data?.url || '/'
  // Validate URL: only allow relative paths or same-origin URLs
  const url = rawUrl.startsWith('/') || rawUrl.startsWith(self.location.origin) ? rawUrl : '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if found
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new window
      return self.clients.openWindow(url)
    })
  )
})
