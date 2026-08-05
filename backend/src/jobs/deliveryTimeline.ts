import { prisma } from '../db/prisma'
import { notifyUser } from '../lib/notify'

const DAY_MS = 24 * 60 * 60 * 1000

// Toimituksen aikataulu SHIPPED-tilauksille (shippedAt:sta laskettuna):
// päivä 5  — muistutus jos paketti ei ole vielä kuitattu vastaanotetuksi
// päivä 10 — muistutus ostajalle: kuittaa vastaanotto tai ilmoita ongelmasta
// päivä 14 — jos ostaja ei ole reagoinut, tilaus suljetaan automaattisesti ja maksu vapautetaan myyjälle
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
