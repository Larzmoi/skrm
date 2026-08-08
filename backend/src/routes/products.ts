import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /products
router.get('/', async (req, res) => {
  const { category, alakategoria, tyyppi, sort, search, limit } = req.query
  const where: any = { status: 'PENDING', saleType: { in: ['buy_now', 'both'] } }
  if (category && category !== 'kaikki') where.category = String(category)
  if (alakategoria) where.alakategoria = String(alakategoria)
  if (tyyppi) where.tyyppi = String(tyyppi)
  if (search) where.name = { contains: String(search), mode: 'insensitive' }
  let orderBy: any = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { startPrice: 'asc' }
  if (sort === 'price_desc') orderBy = { startPrice: 'desc' }
  const products = await prisma.product.findMany({
    where, orderBy, take: limit ? Number(limit) : 50,
    include: { seller: { select: { id: true, name: true, username: true, city: true } } },
  })
  res.json(products)
})

// GET /products/mine
router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  const products = await prisma.product.findMany({
    where: { sellerId: req.userId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(products)
})

// GET /products/:id
router.get('/:id', async (req, res) => {
  const id = String(req.params.id)
  const product = await prisma.product.findUnique({
    where: { id },
    include: { seller: { select: { id: true, name: true, username: true, avatarUrl: true, city: true } } },
  })
  if (!product) return res.status(404).json({ error: 'Tuotetta ei löydy' })
  res.json(product)
})

// POST /products
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, saleType, startPrice, buyNowPrice, reservePrice, bidIncrement, auctionDuration, auctionDurationDays, auctionDurationHours, quantity, condition, description, imageUrl, category, alakategoria, tyyppi, city, pakettikoko, showId } = req.body
  if (!name || !startPrice) return res.status(400).json({ error: 'Nimi ja hinta vaaditaan' })

  // Perinteinen huutokauppa: auctionDurationDays/Hours on kesto luontihetkellä, ei tallenneta sellaisenaan —
  // vain päättymisajankohta persistoidaan (eri asia kuin live-lotin auctionDuration, joka on sekunteina)
  const MAX_AUCTION_HOURS = 30 * 24
  let auctionEndsAt: Date | undefined
  if (saleType === 'auction') {
    const totalHours = Math.min(
      MAX_AUCTION_HOURS,
      Math.max(1, (Number(auctionDurationDays) || 0) * 24 + (Number(auctionDurationHours) || 0)),
    )
    auctionEndsAt = new Date(Date.now() + totalHours * 60 * 60 * 1000)
  }

  const product = await prisma.product.create({
    data: {
      name, saleType: saleType ?? 'live',
      startPrice: Number(startPrice),
      buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
      reservePrice: reservePrice ? Number(reservePrice) : null,
      bidIncrement: bidIncrement ? Number(bidIncrement) : null,
      auctionDuration: auctionDuration ? Number(auctionDuration) : null,
      auctionEndsAt,
      quantity: Number(quantity ?? 1),
      condition: condition ?? null, description: description ?? null,
      imageUrl: imageUrl ?? null, category: category ?? null,
      alakategoria: alakategoria ?? null, tyyppi: tyyppi ?? null, city: city ?? null, pakettikoko: pakettikoko ?? null,
      sellerId: req.userId!, showId: showId ?? null,
    },
  })
  res.status(201).json(product)
})

// PUT /products/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product || product.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })

  // Perinteinen huutokauppa jolla on jo huutoja: kategoriaa ei saa enää vaihtaa kesken huutokaupan —
  // bidaajat ovat voineet löytää/huutaa tuotteen juuri sen kategorian perusteella.
  const newCategory = req.body.category ?? null
  const newAlakategoria = req.body.alakategoria ?? null
  const newTyyppi = req.body.tyyppi ?? null
  const categoryChanged = newCategory !== product.category || newAlakategoria !== product.alakategoria || newTyyppi !== product.tyyppi
  if (categoryChanged && product.saleType === 'auction' && product.currentBid != null) {
    return res.status(400).json({ error: 'Kategoriaa ei voi enää muuttaa — huutokauppa on jo käynnissä' })
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: req.body.name, saleType: req.body.saleType,
      startPrice: req.body.startPrice ? Number(req.body.startPrice) : undefined,
      buyNowPrice: req.body.buyNowPrice ? Number(req.body.buyNowPrice) : null,
      reservePrice: req.body.reservePrice ? Number(req.body.reservePrice) : null,
      bidIncrement: req.body.bidIncrement ? Number(req.body.bidIncrement) : null,
      auctionDuration: req.body.auctionDuration ? Number(req.body.auctionDuration) : null,
      quantity: req.body.quantity ? Number(req.body.quantity) : undefined,
      condition: req.body.condition ?? null, description: req.body.description ?? null,
      imageUrl: req.body.imageUrl ?? undefined, category: newCategory,
      alakategoria: newAlakategoria, tyyppi: newTyyppi, city: req.body.city ?? null, pakettikoko: req.body.pakettikoko ?? null,
    },
  })
  res.json(updated)
})

// DELETE /products/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const product = await prisma.product.findUnique({ where: { id }, include: { orderItems: true } })
  if (!product || product.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (product.orderItems.length > 0) return res.status(400).json({ error: 'Tuote on osa tilausta, ei voida poistaa' })

  // Perinteinen huutokauppa: ei voi poistaa jos varaushinta on jo ylittynyt (tai jos ei varaushintaa
  // ollenkaan ja huuto on jo tullut) — huuto on silloin LUKITTU-säännön mukaisesti sitova.
  if (product.saleType === 'auction' && product.currentBid != null && (!product.reservePrice || product.currentBid >= product.reservePrice)) {
    return res.status(400).json({ error: 'Tuotetta ei voi poistaa — varaushinta on ylittynyt, huuto on sitova' })
  }

  await prisma.autoBid.deleteMany({ where: { productId: id } })
  await prisma.bid.deleteMany({ where: { productId: id } })
  await prisma.cartItem.deleteMany({ where: { productId: id } })
  await prisma.message.updateMany({ where: { productId: id }, data: { productId: null } })
  await prisma.product.delete({ where: { id } })
  res.json({ ok: true })
})

export default router
