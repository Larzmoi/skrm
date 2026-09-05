import { prisma } from '../db/prisma'
import { notifyUser } from '../lib/notify'

const DAY_MS = 24 * 60 * 60 * 1000

// Toimituksen aikataulu SHIPPED-tilauksille (LUKITTU, ks. CLAUDE.md "Toimituksen aikataulu ja
// maksuturva", TÄSMENNETTY 2026-09-04: ostajan oma kuittaus vapauttaa HETI, ei enää 24h-jaksoa).
//
// Ostajan oma `POST /orders/:id/confirm-delivery` vapauttaa maksun VÄLITTÖMÄSTI (ks. orders.ts) -
// tilaus siirtyy suoraan SHIPPED → DELIVERED siinä reitissä, ei koskaan käy tämän cron-jobin
// kautta. Tämä tiedosto käsittelee siis vain sen, kun ostaja EI itse reagoi ollenkaan:
// shippedAt-pohjainen fallback-eskalaatio (päivä 5/10/14), viimeistään päivä 14 vapauttaa
// automaattisesti riippumatta siitä onko ostaja reagoinut.
//
// ⬜ TULEVAISUUTTA VARTEN: kun Postin oikea Tracking API joskus integroidaan (ks. CLAUDE.md
// "Tekemättä"), "Posti sanoo toimitettu, ostaja ei ole vielä reagoinut" -tilanteelle pitää
// lisätä oma 24h-tarkastusikkuna TÄHÄN - eri asia kuin ostajan oma aktiivinen kuittaus yllä.
// Ei vielä olemassa koska Postin tracking on yhä simuloitu (getTrackingStatus()), ei oikea webhook.
export async function checkDeliveryTimeline() {
  const shipped = await prisma.order.findMany({ where: { status: 'SHIPPED', shippedAt: { not: null } } })
  const now = Date.now()

  for (const order of shipped) {
    const age = now - order.shippedAt!.getTime()

    if (age >= 14 * DAY_MS) {
      // TODO: Paytrail capture — vapauta maksu myyjälle kun oikea integraatio on käytössä
      await prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } })
      await notifyUser(order.sellerId, 'PAYMENT_RELEASED', 'Maksu vapautettu', 'Ostaja ei reagoinut 14 päivän kuluessa — tilaus suljettiin automaattisesti ja maksu on vapautettu sinulle.', '/dashboard/tilaukset')
      await notifyUser(order.buyerId, 'ORDER_AUTO_COMPLETED', 'Tilaus suljettu automaattisesti', 'Et kuitannut tilausta 14 päivän kuluessa, joten se suljettiin automaattisesti.', '/ostot')
      continue
    }

    if (age >= 10 * DAY_MS && !order.reminderNotifiedAt) {
      await prisma.order.update({ where: { id: order.id }, data: { reminderNotifiedAt: new Date() } })
      await notifyUser(order.buyerId, 'DELIVERY_REMINDER', 'Muistutus: kuittaa tilaus', 'Kuittaa vastaanotto tai ilmoita ongelmasta — tilaus suljetaan automaattisesti 14 päivän kuluttua lähetyksestä.', '/ostot')
    }

    if (age >= 5 * DAY_MS && !order.stalledNotifiedAt) {
      // TODO: tarkista Postin API:sta onko paketti liikkunut ennen ilmoitusta — odottaa Postin tracking-integraatiota
      await prisma.order.update({ where: { id: order.id }, data: { stalledNotifiedAt: new Date() } })
      await notifyUser(order.sellerId, 'SHIPPING_STALLED', 'Lähetys ei ole edennyt', 'Tilausta ei ole vielä kuitattu vastaanotetuksi 5 päivän kuluttua lähetyksestä.', '/dashboard/tilaukset')
      await notifyUser(order.buyerId, 'SHIPPING_STALLED', 'Onko pakettisi saapunut?', 'Kuittaa vastaanotto tai ilmoita ongelmasta, jos pakettia ei ole näkynyt.', '/ostot')
    }
  }

  return shipped.length
}
