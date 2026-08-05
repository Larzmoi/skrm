import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { getShippingPrice } from '../lib/shipping'
import { createPaymentSession } from '../lib/paytrail'
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

  const session = createPaymentSession({ amount: price, orderId: order.id, reference: `shipping-${order.id}` })

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { shippingSize: pakettikokoId, shippingPrice: price, paytrailPaymentId: session.paymentId },
  })

  res.json({ order: updated, redirectUrl: session.redirectUrl })
})

// POST /orders/:id/mock-pay — Paytrailin korvike testausta varten (TODO: poista kun oikea integraatio tehty)
router.post('/:id/mock-pay', authMiddleware, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } })
  if (!order || order.buyerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })

  if (order.status === 'PENDING_PAYMENT') {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PENDING_SHIPPING_SELECTION', paymentDeadline: null },
    })
    await notifyUser(order.sellerId, 'ORDER_PAID', 'Ostaja maksoi tilauksen', `Tilaus ${order.productTotal.toLocaleString('fi-FI')}€ on maksettu, ostaja valitsee vielä toimitustavan.`, '/dashboard/tilaukset')
    return res.json(updated)
  }

  if (order.status === 'PENDING_SHIPPING_SELECTION' && order.shippingPrice != null) {
    const updated = await prisma.order.update({ where: { id: order.id }, data: { status: 'PENDING_SHIPPING' } })
    await notifyUser(order.sellerId, 'ORDER_PAID', 'Toimitus maksettu — valmis lähetettäväksi', `Tilaus on nyt kokonaan maksettu ja valmiina lähetettäväksi.`, '/dashboard/tilaukset')
    return res.json(updated)
  }

  res.status(400).json({ error: 'Ei odottavaa maksua' })
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
