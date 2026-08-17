import { pushApi } from './api'

// Web Push -tilaus (ks. CLAUDE.md "Push-ilmoitukset"). VAPID-julkinen avain paljastetaan
// buildaus-aikaisena NEXT_PUBLIC-muuttujana - ei salainen, tarkoitettu selaimelle.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

// PushManager.subscribe vaatii base64url-koodatun avaimen Uint8Array-muodossa, ei suoraan
// merkkijonona - standardi muunnos MDN:n Web Push -esimerkeistä.
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

// Kutsutaan käyttäjän eleen sisällä (esim. "Seuraa"-napin klikkaus) - selaimet voivat
// jättää lupapyynnön huomiotta jos sitä ei tehdä suoraan käyttäjän toiminnon yhteydessä.
// Epäonnistuminen (esto, ei tuettu, jo tilattu toisin) ei koskaan estä itse pääasiallista
// toimintoa (esim. seuraamista) - virheet vain niellään hiljaa.
export async function subscribeToPush(): Promise<void> {
  if (!pushSupported()) return
  try {
    if (Notification.permission === 'denied') return
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      })
    }
    const json = subscription.toJSON()
    await pushApi.subscribe(subscription.endpoint, json.keys!.p256dh, json.keys!.auth)
  } catch {
    // Hiljainen epäonnistuminen — push on mukavuuslisä, ei kriittinen toiminto.
  }
}
