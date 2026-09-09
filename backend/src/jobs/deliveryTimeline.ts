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
      // Ei vaadi erillistä maksun vapautus-/capture-kutsua — Stripen destination charge (ks.
      // lib/stripe.ts createCheckoutSession) siirsi myyjän osuuden hänen tililleen jo
      // maksuhetkellä, tämä vain päivittää tilauksen tilan.
      await prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } })
      await notifyUser(order.sellerId, 'PAYMENT_RELEASED', 'Maksu vapautettu', 'Ostaja ei reagoinut 14 päivän kuluessa — tilaus suljettiin automaattisesti ja maksu on vapautettu sinulle.', '/dashboard/tilaukset')
      await notifyUser(order.buyerId, 'ORDER_AUTO_COMPLETED', 'Tilaus suljettu automaattisesti', 'Et kuitannut tilausta 14 päivän kuluessa, joten se suljettiin automaattisesti.', '/ostot')
      // Habahubin OMA vastuu Posti-reklamaatiosta (ks. CLAUDE.md "Toimituksen aikataulu ja
      // maksuturva", "UUSI LÖYDÖS 2026-09-05") - jos toimitus ei koskaan vahvistunut, paketti on
      // todennäköisesti kadonnut. Habahub on Posti-logistiikkasopimuksen (691317) haltija, ei
      // ostaja/myyjä - vain Habahub voi/pitäisi reklamoida Postille mahdollisen korvauksen
      // saamiseksi. Ilman tätä kukaan ei koskaan saanut mitään muistutusta tehdä niin -
      // ostajalle/myyjälle meneviä ilmoituksia yllä ei ollut tarkoitettu tähän. Käyttää
      // olemassa olevaa ilmoitusjärjestelmää (näkyy adminille /ilmoitukset-sivulla), ei uutta
      // erillistä tehtävälistaa - riittävä "muistutus" ilman ylimääräistä UI:ta.
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      await Promise.all(admins.map(a => notifyUser(
        a.id, 'ADMIN_LOST_PACKAGE_REVIEW', 'Kadonnut paketti — harkitse Posti-reklamaatiota',
        `Tilaus ${order.id} vapautui automaattisesti 14 päivän jälkeen ilman toimitusvahvistusta — paketti on todennäköisesti kadonnut. Habahub sopimuksenhaltijana (691317) voi reklamoida Postille mahdollisen korvauksen saamiseksi.`,
        '/dashboard/tilaukset',
      ).catch(() => {})))
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
