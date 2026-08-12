import { Router, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { getShippingPrice } from '../lib/shipping'
import { createPayment, refundFull, refundItem, computeCommissionCents } from '../lib/paytrail'
import * as postiService from '../lib/postiService'
import { notifyUser } from '../lib/notify'

const router = Router()

// Nouto-tilauksen vahvistuskoodi — 6 numeroa, helppo lukea/sanoa ääneen fyysisessä noudossa
function generatePickupCode(): string {
  return String(crypto.randomInt(100000, 1000000))
}

// Laskee postitus-tilauksen Posti-seurantatilan tuoreena (MOCK, ks. lib/postiService.ts) aina
// kun tilauslista haetaan — ei vaadi erillistä pollausreittiä, sama periaate kuin oikea
// integraatio joskus tekisi taustalla. Kirjoittaa kannan päivitetyn tilan vain jos se muuttui.
async function withLiveTrackingStatus<T extends { id: string; trackingNumber: string | null; shippedAt: Date | null; postiStatus: string | null }>(order: T): Promise<T> {
  if (!order.trackingNumber || !order.shippedAt) return order
  const { status } = postiService.getTrackingStatus(order.trackingNumber, order.shippedAt)
  if (status !== order.postiStatus) {
    await prisma.order.update({ where: { id: order.id }, data: { postiStatus: status } }).catch(() => {})
  }
  return { ...order, postiStatus: status }
}

const orderInclude = {
  items: { include: { product: { select: { id: true, name: true, imageUrl: true, condition: true } } } },
  buyer: { select: { id: true, name: true, username: true, address: true, postalCode: true, city: true, phone: true } },
  seller: { select: { id: true, name: true, username: true } },
  reviews: { select: { reviewerId: true } },
}

// GET /orders/mine — omat ostot
router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { buyerId: req.userId! },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  })
  res.json(await Promise.all(orders.map(withLiveTrackingStatus)))
})

// GET /orders/selling — myyntitilaukset
router.get('/selling', authMiddleware, async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { sellerId: req.userId! },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  })
  // pickupCode ei näy myyjälle etukäteen — ostaja kertoo/näyttää sen fyysisessä noudossa,
  // myyjä syöttää sen /confirm-pickup:iin vasta silloin
  const stripped = orders.map(({ pickupCode, ...rest }) => rest)
  res.json(await Promise.all(stripped.map(withLiveTrackingStatus)))
})

// POST /orders/:id/select-shipping — ostaja valitsee toimitustavan ENNEN maksua (ei enää
// oma erillinen maksuvaiheensa, ks. CLAUDE.md "Paytrail" — omistajan korjaus 2026-08-12:
// tuote ja toimitus maksetaan aina yhdessä, ei kahdessa erillisessä Paytrail-maksussa).
router.post('/:id/select-shipping', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
  if (!order || order.buyerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (order.status !== 'PENDING_PAYMENT') return res.status(400).json({ error: 'Tilaus on jo maksettu tai ei odota maksua' })
  if (!order.shippingWindowEnd || order.shippingWindowEnd < new Date()) {
    return res.status(400).json({ error: 'Yhdistetyn lähetyksen 6h ikkuna on umpeutunut' })
  }

  const { pakettikokoId, pickupPointId } = req.body
  const price = getShippingPrice(String(pakettikokoId ?? ''))
  if (price === null) return res.status(400).json({ error: 'Virheellinen pakettikoko' })

  const isNouto = pakettikokoId === 'nouto'
  const isPostitus = pakettikokoId === 'postitus'

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      shippingSize: pakettikokoId,
      shippingPrice: price,
      // pickupPointId = ostajan valitsema Postin noutopiste (MOCK, ks. lib/postiService.ts) —
      // eri asia kuin pickupCode, joka koskee "Nouto myyjältä" -toimitustapaa
      pickupPointId: isPostitus ? (pickupPointId ? String(pickupPointId) : null) : null,
      ...(isNouto ? { pickupCode: generatePickupCode() } : {}),
    },
  })

  res.json({ order: updated })
})

// POST /orders/:id/pay — käynnistää YHDEN Paytrail-maksun koko tilaukselle (tuote +
// toimitus yhdessä — vaatii että toimitustapa on jo valittu, ks. select-shipping yllä).
// Korvaa vanhan mock-pay-testivirran (ks. CLAUDE.md "Paytrail").
router.post('/:id/pay', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: String(req.params.id) },
    include: {
      items: { include: { product: { select: { name: true } } } },
      buyer: { select: { email: true } },
    },
  })
  if (!order || order.buyerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (order.status !== 'PENDING_PAYMENT') return res.status(400).json({ error: 'Ei odottavaa maksua' })
  if (order.shippingPrice == null) return res.status(400).json({ error: 'Valitse ensin toimitustapa' })

  // HUOM status 400, ei 502/500 - Cloudflare korvaa 502/503/504-vastausten rungon omalla
  // geneerisellä virhesivullaan (ohittaa alkuperäisen JSON-bodyn kokonaan), havaittu
  // testauksessa refund-reitillä. 400 kulkee läpi sellaisenaan.
  try {
    const items = order.items.map(i => ({
      itemId: i.id, name: i.product.name, unitPriceEuros: i.price, quantity: i.quantity,
      sellerId: order.sellerId, chargeCommission: true,
    }))
    // Toimitus omana rivinään samassa maksussa - ei komissiota postista, SKRM ottaa
    // osuutensa vain myyntihinnasta (LUKITTU-sääntö).
    if (order.shippingPrice > 0) {
      items.push({ itemId: `${order.id}-shipping`, name: 'Toimitus', unitPriceEuros: order.shippingPrice, quantity: 1, sellerId: order.sellerId, chargeCommission: false })
    }
    const session = await createPayment({ orderId: order.id, items, buyerEmail: order.buyer.email })
    await prisma.order.update({ where: { id: order.id }, data: { paytrailPaymentId: session.transactionId, paytrailProductTxId: session.transactionId, paytrailAttemptId: session.attemptId } })
    return res.json({ order, redirectUrl: session.redirectUrl })
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Maksun aloitus epäonnistui' })
  }
})

// POST /orders/:id/refund — myyjä hyvittää maksetun tilauksen, kokonaan tai per-tuote
// (Shop-in-Shopin natiivi tuki: hyvitys palautuu suoraan oikealle osapuolelle, komissio-
// osuus palautuu SKRM:n komissiotililtä takaisin myyjälle samassa pyynnössä).
// Body: { itemIds?: string[] } — jätä pois tai anna tyhjä taulukko koko tuotemaksun
// hyvittämiseksi, tai anna tietyt OrderItem-ID:t hyvittääksesi vain ne.
router.post('/:id/refund', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: String(req.params.id) },
    include: { items: true },
  })
  if (!order || order.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (!order.paytrailProductTxId) return res.status(400).json({ error: 'Tilaukselle ei ole maksettua tuotemaksua hyvitettäväksi' })
  if (!['PENDING_SHIPPING', 'SHIPPED', 'DELIVERED', 'DISPUTED'].includes(order.status)) {
    return res.status(400).json({ error: 'Tilaus ei ole maksetussa tilassa' })
  }

  const itemIds: string[] = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []

  try {
    if (itemIds.length === 0) {
      // Koko maksu (tuote+toimitus, ne maksettiin yhdessä - ks. CLAUDE.md "Paytrail")
      await refundFull(order.paytrailProductTxId, order.productTotal + (order.shippingPrice ?? 0))
    } else {
      if (!order.paytrailAttemptId) return res.status(400).json({ error: 'Rivikohtaista hyvitystä ei voi tehdä tälle tilaukselle (vanha maksu ilman tallennettua yritys-ID:tä)' })
      const items = order.items.filter(i => itemIds.includes(i.id))
      if (items.length === 0) return res.status(400).json({ error: 'Tuntemattomat tuoterivit' })
      for (const item of items) {
        const commissionEuros = computeCommissionCents(item.price * item.quantity) / 100
        await refundItem(order.paytrailProductTxId, item.id, order.paytrailAttemptId, item.price * item.quantity, order.sellerId, commissionEuros)
      }
    }
  } catch (e: any) {
    return res.status(400).json({ error: e.message ?? 'Hyvitys epäonnistui Paytraililta' })
  }

  await notifyUser(order.buyerId, 'REFUND_ISSUED', 'Sait hyvityksen', `Myyjä hyvitti tilauksen ${order.id} — hyvitys näkyy maksutavallasi muutaman päivän sisällä.`, '/ostot')
  res.json({ ok: true })
})

// POST /orders/:id/tracking — myyjä lisää seurantakoodin
router.post('/:id/tracking', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
  if (!order || order.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (order.status !== 'PENDING_SHIPPING') return res.status(400).json({ error: 'Tilaus ei odota lähetystä' })

  const { trackingCode } = req.body
  if (!trackingCode) return res.status(400).json({ error: 'Seurantakoodi vaaditaan' })

  // TODO: Paytrail capture — vapauta tuotteen maksu myyjälle kun oikea integraatio on käytössä
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { trackingCode, status: 'SHIPPED', shippedAt: new Date() },
  })
  await notifyUser(order.buyerId, 'ORDER_SHIPPED', 'Tilauksesi lähetettiin', `Seurantakoodi: ${trackingCode}`, '/ostot')
  res.json(updated)
})

// POST /orders/:id/create-shipment — myyjä luo Posti-lähetyksen postitus-tilaukselle (MOCK, ks.
// CLAUDE.md "Mikä voidaan rakentaa NYT ilman Postin sopimusta/tunnuksia" + lib/postiService.ts).
// Korvaa manuaalisen seurantakoodin syötön automaattisesti generoidulla trackingNumber+
// sendingCode-parilla, jonka myyjä kirjoittaa pakettiin ilman tulostettavaa osoitekorttia.
router.post('/:id/create-shipment', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
  if (!order || order.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (order.shippingSize !== 'postitus') return res.status(400).json({ error: 'Tilaus ei ole postitus-toimitustavalla' })
  if (order.status !== 'PENDING_SHIPPING') return res.status(400).json({ error: 'Tilaus ei odota lähetystä' })

  const { shipments } = postiService.createShipment()
  const { trackingNumber, sendingCode } = shipments[0]

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { trackingNumber, sendingCode, postiStatus: 'RECEIVED', status: 'SHIPPED', shippedAt: new Date() },
  })
  await notifyUser(order.buyerId, 'ORDER_SHIPPED', 'Tilauksesi lähetettiin', `Lähetyskoodi: ${sendingCode}`, '/ostot')
  res.json(updated)
})

// POST /orders/:id/confirm-pickup — myyjä vahvistaa noutokoodin fyysisessä noudossa, vapauttaa maksun heti
router.post('/:id/confirm-pickup', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
  if (!order || order.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (order.shippingSize !== 'nouto') return res.status(400).json({ error: 'Tilaus ei ole nouto-toimitustavalla' })
  if (order.status !== 'PENDING_SHIPPING') return res.status(400).json({ error: 'Tilaus ei odota noutoa' })

  const code = String(req.body?.code ?? '').trim()
  if (!code) return res.status(400).json({ error: 'Noutokoodi vaaditaan' })
  if (code !== order.pickupCode) return res.status(400).json({ error: 'Väärä noutokoodi' })

  // Sama vapautuslogiikka kuin "Postin API sanoo toimitettu" -tapauksessa, mutta heti — molemmat osapuolet
  // ovat fyysisesti läsnä ja voivat vahvistaa vaihdon saman tien, ei tarvitse odottaa 14 päivää
  // TODO: Paytrail capture — vapauta tuotteen maksu myyjälle kun oikea integraatio on käytössä
  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } })
  await notifyUser(order.sellerId, 'PAYMENT_RELEASED', 'Maksu vapautettu', 'Noutokoodi vahvistettu — maksu on vapautettu sinulle.', '/dashboard/tilaukset')
  await notifyUser(order.buyerId, 'ORDER_DELIVERED', 'Nouto vahvistettu', 'Myyjä vahvisti noudon — kauppa on suoritettu.', '/ostot')
  res.json(updated)
})

// POST /orders/:id/confirm-delivery — ostaja kuittaa tuotteen vastaanotetuksi
router.post('/:id/confirm-delivery', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
  if (!order || order.buyerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (order.status !== 'SHIPPED') return res.status(400).json({ error: 'Tilaus ei odota vastaanottokuittausta' })

  // TODO: Paytrail capture — vapauta maksu myyjälle kun oikea integraatio on käytössä
  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } })
  await notifyUser(order.sellerId, 'PAYMENT_RELEASED', 'Maksu vapautettu', `Ostaja kuittasi tilauksen vastaanotetuksi — maksu on vapautettu sinulle.`, '/dashboard/tilaukset')
  res.json(updated)
})

// POST /orders/:id/dispute — ostaja ilmoittaa ongelmasta
router.post('/:id/dispute', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
  if (!order || order.buyerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (order.status !== 'SHIPPED') return res.status(400).json({ error: 'Tilaus ei ole reklamoitavissa' })

  const reason = String(req.body?.reason ?? '').trim().slice(0, 1000) || 'Ei tarkennettu'
  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: 'DISPUTED', disputeReason: reason } })

  // TODO: ilmoitus SKRM:n adminille kun admin-paneeli on olemassa
  console.log(`[dispute] Tilaus ${order.id} reklamoitu: ${reason}`)
  await notifyUser(order.sellerId, 'DISPUTE_OPENED', 'Ostaja avasi reklamaation', reason, '/dashboard/tilaukset')
  await notifyUser(order.buyerId, 'DISPUTE_OPENED', 'Reklamaatio vastaanotettu', 'Olemme vastaanottaneet reklamaatiosi ja selvitämme asiaa.', '/ostot')

  res.json(updated)
})

// POST /orders/:id/review — ostaja arvostelee myyjän tai myyjä ostajan, kun tilaus on toimitettu
router.post('/:id/review', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: String(req.params.id) },
    include: { buyer: { select: { username: true } }, seller: { select: { username: true } } },
  })
  if (!order) return res.status(404).json({ error: 'Tilausta ei löydy' })

  let revieweeId: string
  let revieweeUsername: string
  if (order.buyerId === req.userId) { revieweeId = order.sellerId; revieweeUsername = order.seller.username }
  else if (order.sellerId === req.userId) { revieweeId = order.buyerId; revieweeUsername = order.buyer.username }
  else return res.status(403).json({ error: 'Ei oikeutta' })

  if (order.status !== 'DELIVERED') return res.status(400).json({ error: 'Tilaus ei ole vielä toimitettu' })

  const rating = Math.round(Number(req.body?.rating))
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Arvosanan tulee olla 1-5' })
  const comment = String(req.body?.comment ?? '').trim().slice(0, 1000) || null

  try {
    const review = await prisma.review.create({
      data: { orderId: order.id, reviewerId: req.userId!, revieweeId, rating, comment },
    })
    await notifyUser(revieweeId, 'REVIEW_RECEIVED', 'Sait uuden arvostelun', `${rating}/5 tähteä`, `/u/${revieweeUsername}`)
    res.status(201).json(review)
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Olet jo arvostellut tämän kaupan' })
    res.status(500).json({ error: 'Arvostelun tallennus epäonnistui' })
  }
})

export default router
