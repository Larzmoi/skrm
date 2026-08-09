import { Router, Request, Response } from 'express'
import express from 'express'
import { prisma } from '../db/prisma'
import { notifyUser, emitToShow } from '../lib/notify'
import { webhookReceiver, sellerIdFromRoomName } from '../lib/livekit'

const router = Router()

const VIOLATIONS_BEFORE_BAN = 3
const BAN_DAYS = 30

// Peruuttaa erääntyneet (maksamattomat) tilaukset, vapauttaa tuotteet,
// kirjaa PaymentViolationin ja bannaa käyttäjän 30 päiväksi 3. rikkomuksesta.
export async function checkExpiredPayments() {
  const expired = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', paymentDeadline: { lt: new Date() } },
    include: { items: { include: { product: true } } },
  })

  for (const order of expired) {
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
      // Huutokauppatuote ei palaa PENDING-tilaan (auctionEndsAt on jo mennyt — closeAuctions poimisi sen heti
      // uudelleen ja yrittäisi ilmoittaa samalle maksamattomalle voittajalle loputtomasti). Merkitään lopullisesti
      // myymättömäksi — myyjä voi listata sen uudestaan manuaalisesti jos haluaa.
      ...order.items.map(item => item.product.saleType === 'auction'
        ? prisma.product.update({
            where: { id: item.productId },
            data: { status: 'UNSOLD', finalPrice: null, currentBid: null, currentBidderId: null, auctionEndsAt: null },
          })
        : prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity }, status: 'PENDING', finalPrice: null },
          })
      ),
      prisma.paymentViolation.create({ data: { userId: order.buyerId, orderId: order.id } }),
    ])

    await notifyUser(order.buyerId, 'PAYMENT_EXPIRED', 'Maksuaika umpeutui', 'Tilauksesi maksuaika umpeutui ja tilaus peruutettiin.', '/ostot')

    const violationCount = await prisma.paymentViolation.count({ where: { userId: order.buyerId } })
    if (violationCount >= VIOLATIONS_BEFORE_BAN) {
      const activeBan = await prisma.ban.findFirst({ where: { userId: order.buyerId, endsAt: { gt: new Date() } } })
      if (!activeBan) {
        const ban = await prisma.ban.create({
          data: {
            userId: order.buyerId,
            reason: 'Toistuvat maksamattomat tilaukset',
            endsAt: new Date(Date.now() + BAN_DAYS * 24 * 60 * 60 * 1000),
          },
        })
        await notifyUser(order.buyerId, 'BAN_ISSUED', 'Tilisi on estetty', `Tilisi on estetty ${BAN_DAYS} päiväksi toistuvien maksamattomien tilausten vuoksi.`, '/dashboard/profiili')
        // TODO: Resend — ilmoita käyttäjälle bannista sähköpostilla kun skrm.fi-domain on aktivoitu
        console.log(`[ban] Käyttäjä ${order.buyerId} bannattu ${ban.endsAt.toISOString()} asti (${violationCount} maksamatonta tilausta)`)
      }
    }
  }

  return expired.length
}

// POST /webhooks/payment-expired — kutsutaan ulkoisesta cronista (esim. tuotannon 5min ajastin)
router.post('/payment-expired', async (_req: Request, res: Response) => {
  const cancelled = await checkExpiredPayments()
  res.json({ cancelled })
})

// POST /webhooks/livekit — LiveKit kutsuu Ingress-tapahtumista (2026-08-09 migraatio
// MediaMTX:n runOnAvailable/runOnUnavailable-shell-hookeista, ks. CLAUDE.md "PÄÄTÖS
// 2026-08-09"). Huoneen nimestä ("seller-{userId}") pääteltävä myyjä ja hänen aktiivinen
// lähetyksensä samalla logiikalla kuin ennen. Vaatii raa'an pyyntörungon allekirjoituksen
// varmistamiseksi (WebhookReceiver.receive), ei siis express.json()-jäsennystä tälle reitille.
router.post('/livekit', express.raw({ type: '*/*' }), async (req: Request, res: Response) => {
  let event
  try {
    event = await webhookReceiver.receive(req.body.toString('utf8'), req.headers.authorization)
  } catch {
    return res.status(401).send('invalid signature')
  }

  const roomName = event.ingressInfo?.roomName ?? event.room?.name
  const sellerId = roomName ? sellerIdFromRoomName(roomName) : null

  if (event.event === 'ingress_started') {
    // EI muuta Show'n statusta SCHEDULED -> LIVE automaattisesti — OBS-yhteyden muodostuminen
    // tarkoittaa vain että myyjä näkee yksityisen esikatselun. Julkiseksi lähetys tulee vasta
    // eksplisiittisestä "Aloita julkinen lähetys" -painalluksesta (PATCH /shows/:id/status).
    // Ks. CLAUDE.md "Live-lähetyksen esikatselu ennen julkista näkyvyyttä". Ei siis tarvitse
    // tehdä mitään tässä paitsi kuitata onnistuneesti - reitti on olemassa lähinnä loggausta/
    // tulevaa käyttöä varten.
  } else if (event.event === 'ingress_ended' && sellerId) {
    const show = await prisma.show.findFirst({
      where: { sellerId, status: 'LIVE' },
      orderBy: { startedAt: 'desc' },
    })
    if (show) {
      await prisma.show.update({ where: { id: show.id }, data: { status: 'ENDED', endedAt: new Date() } })
      emitToShow(show.id, 'show_status', { status: 'ENDED' })
    }
  }

  res.status(200).send('ok')
})

export default router
