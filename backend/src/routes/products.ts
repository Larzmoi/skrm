import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /products
router.get('/', async (req, res) => {
  const { category, alakategoria, sort, search, limit } = req.query
  const where: any = { status: 'PENDING', saleType: { in: ['buy_now', 'both'] } }
  if (category && category !== 'kaikki') where.category = String(category)
  if (alakategoria) where.alakategoria = String(alakategoria)
  if (search) where.name = { contains: String(search), mode: 'insensitive' }
  let orderBy: any = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { startPrice: 'asc' }
  if (sort === 'price_desc') orderBy = { startPrice: 'desc' }
  const products = await prisma.product.findMany({
    where, orderBy, take: limit ? Number(limit) : 50,
    include: { seller: { select: { id: true, name: true, username: true } } },
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
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { seller: { select: { id: true, name: true, username: true } } },
  })
  if (!product) return res.status(404).json({ error: 'Tuotetta ei löydy' })
  res.json(product)
})

// POST /products
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, saleType, startPrice, buyNowPrice, reservePrice, auctionDuration, quantity, condition, description, imageUrl, category, alakategoria, pakettikoko, showId } = req.body
  if (!name || !startPrice) return res.status(400).json({ error: 'Nimi ja hinta vaaditaan' })
  const product = await prisma.product.create({
    data: {
      name, saleType: saleType ?? 'live',
      startPrice: Number(startPrice),
      buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
      reservePrice: reservePrice ? Number(reservePrice) : null,
      auctionDuration: auctionDuration ? Number(auctionDuration) : null,
      quantity: Number(quantity ?? 1),
      condition: condition ?? null, description: description ?? null,
      imageUrl: imageUrl ?? null, category: category ?? null,
      alakategoria: alakategoria ?? null, pakettikoko: pakettikoko ?? null,
      sellerId: req.userId!, showId: showId ?? null,
    },
  })
  res.status(201).json(product)
})

// PUT /products/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product || product.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      name: req.body.name, saleType: req.body.saleType,
      startPrice: req.body.startPrice ? Number(req.body.startPrice) : undefined,
      buyNowPrice: req.body.buyNowPrice ? Number(req.body.buyNowPrice) : null,
      reservePrice: req.body.reservePrice ? Number(req.body.reservePrice) : null,
      auctionDuration: req.body.auctionDuration ? Number(req.body.auctionDuration) : null,
      quantity: req.body.quantity ? Number(req.body.quantity) : undefined,
      condition: req.body.condition ?? null, description: req.body.description ?? null,
      imageUrl: req.body.imageUrl ?? undefined, category: req.body.category ?? null,
      alakategoria: req.body.alakategoria ?? null, pakettikoko: req.body.pakettikoko ?? null,
    },
  })
  res.json(updated)
})

// DELETE /products/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product || product.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  await prisma.product.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
