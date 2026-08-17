// Web Push -service worker (ks. CLAUDE.md "Push-ilmoitukset"). Minimaalinen - ei
// välimuistita mitään, hoitaa vain push-tapahtumien näyttämisen ja klikkauksen.
self.addEventListener('push', event => {
  let data = { title: 'SKRM', body: '' }
  try { data = event.data.json() } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'SKRM', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
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
