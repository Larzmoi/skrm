import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { getShippingPrice } from '../lib/shipping'
import { createPayment, refundFull, refundItem, computeCommissionCents } from '../lib/paytrail'
import { notifyUser } from '../lib/notify'

const router = Router()

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
  res.json(orders)
})

// GET /orders/selling — myyntitilaukset
router.get('/selling', authMiddleware, async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { sellerId: req.userId! },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  })
  res.json(orders)
})

// POST /orders/:id/select-shipping — ostaja valitsee toimitustavan
router.post('/:id/select-shipping', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
  if (!order || order.buyerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (order.status !== 'PENDING_SHIPPING_SELECTION') return res.status(400).json({ error: 'Tilaus ei odota toimitusvalintaa' })
  if (!order.shippingWindowEnd || order.shippingWindowEnd < new Date()) {
    return res.status(400).json({ error: 'Yhdistetyn lähetyksen 6h ikkuna on umpeutunut' })
  }

  const { pakettikokoId } = req.body
  const price = getShippingPrice(String(pakettikokoId ?? ''))
  if (price === null) return res.status(400).json({ error: 'Virheellinen pakettikoko' })

  // Maksu käynnistetään erikseen (POST /orders/:id/pay) — sama periaate kuin
  // tuotemaksussa, ei luoda Paytrail-istuntoa ennen kuin ostaja oikeasti maksaa.
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { shippingSize: pakettikokoId, shippingPrice: price },
  })

  res.json({ order: updated })
})

// POST /orders/:id/pay — käynnistää Paytrail-maksun tilauksen NYKYISELLE maksamattomalle
// vaiheelle (tuote tai toimitus) ja palauttaa osoitteen johon ostaja ohjataan maksamaan.
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

  // Nouto (pakettikoko "nouto", hinta 0€) ei vaadi maksua — siirry suoraan eteenpäin.
  if (order.status === 'PENDING_SHIPPING_SELECTION' && order.shippingPrice === 0) {
    const updated = await prisma.order.update({ where: { id: order.id }, data: { status: 'PENDING_SHIPPING' } })
    await notifyUser(order.sellerId, 'ORDER_PAID', 'Tilaus valmis lähetettäväksi', 'Ostaja valitsi noudon — ei erillistä toimitusmaksua.', '/dashboard/tilaukset')
    return res.json({ order: updated, redirectUrl: null })
  }

  // HUOM status 400, ei 502/500 - Cloudflare korvaa 502/503/504-vastausten rungon omalla
  // geneerisellä virhesivullaan (ohittaa alkuperäisen JSON-bodyn kokonaan), havaittu
  // testauksessa refund-reitillä. 400 kulkee läpi sellaisenaan.
  if (order.status === 'PENDING_PAYMENT') {
    try {
      const session = await createPayment({
        orderId: order.id,
        stage: 'product',
        items: order.items.map(i => ({
          itemId: i.id, name: i.product.name, unitPriceEuros: i.price, quantity: i.quantity,
          sellerId: order.sellerId, chargeCommission: true,
        })),
        buyerEmail: order.buyer.email,
      })
      await prisma.order.update({ where: { id: order.id }, data: { paytrailPaymentId: session.transactionId, paytrailProductTxId: session.transactionId } })
      return res.json({ order, redirectUrl: session.redirectUrl })
    } catch (e: any) {
      return res.status(400).json({ error: e.message ?? 'Maksun aloitus epäonnistui' })
    }
  }

  if (order.status === 'PENDING_SHIPPING_SELECTION' && order.shippingPrice != null) {
    try {
      const session = await createPayment({
        orderId: order.id,
        stage: 'shipping',
        items: [{ itemId: `${order.id}-shipping`, name: 'Toimitus', unitPriceEuros: order.shippingPrice, quantity: 1, sellerId: order.sellerId, chargeCommission: false }],
        buyerEmail: order.buyer.email,
      })
      await prisma.order.update({ where: { id: order.id }, data: { paytrailPaymentId: session.transactionId, paytrailShippingTxId: session.transactionId } })
      return res.json({ order, redirectUrl: session.redirectUrl })
    } catch (e: any) {
      return res.status(400).json({ error: e.message ?? 'Maksun aloitus epäonnistui' })
    }
  }

  res.status(400).json({ error: 'Ei odottavaa maksua' })
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
  if (!['PENDING_SHIPPING_SELECTION', 'PENDING_SHIPPING', 'SHIPPED', 'DELIVERED', 'DISPUTED'].includes(order.status)) {
    return res.status(400).json({ error: 'Tilaus ei ole maksetussa tilassa' })
  }

  const itemIds: string[] = Array.isArray(req.body?.itemIds) ? req.body.itemIds : []

  try {
    if (itemIds.length === 0) {
      await refundFull(order.paytrailProductTxId, order.productTotal)
    } else {
      const items = order.items.filter(i => itemIds.includes(i.id))
      if (items.length === 0) return res.status(400).json({ error: 'Tuntemattomat tuoterivit' })
      for (const item of items) {
        const commissionEuros = computeCommissionCents(item.price * item.quantity) / 100
        await refundItem(order.paytrailProductTxId, item.id, item.price * item.quantity, order.sellerId, commissionEuros)
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
