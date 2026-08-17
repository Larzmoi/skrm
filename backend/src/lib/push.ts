import webpush from 'web-push'
import { prisma } from '../db/prisma'

// Web Push -infrastruktuuri (ks. CLAUDE.md "Push-ilmoitukset") - erillinen kanava jo
// olemassa olevasta in-app-Notification-järjestelmästä (notify.ts). Tämä lähettää
// oikean käyttöjärjestelmätason ilmoituksen selaimen/puhelimen kautta, toimii myös kun
// sivusto ei ole auki - notify.ts:n socket-pohjainen ilmoitus vaatii avoimen välilehden.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@skrm.fi'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

// Lähettää pushin käyttäjän KAIKKIIN tunnettuihin selaimiin/laitteisiin rinnakkain.
// Vanhentuneet/peruutetut tilaukset (410 Gone, 404 Not Found - selain on poistanut
// tilauksen, esim. käyttäjä tyhjensi selaindatan) siivotaan pois automaattisesti eikä
// niitä yritetä enää uudestaan.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return // ei konfiguroitu - ei kaadeta kutsujaa

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
    } catch (e: any) {
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      } else {
        console.error('Pushin lähetys epäonnistui:', e?.message ?? e)
      }
    }
  }))
}
