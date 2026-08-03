import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /shows — julkiset live ja tulevat
router.get('/', async (req, res) => {
  const { status } = req.query
  const shows = await prisma.show.findMany({
    where: status ? { status: String(status) as any } : { status: { in: ['LIVE', 'SCHEDULED'] } },
    orderBy: { scheduledAt: 'asc' },
    include: {
      seller: { select: { id: true, name: true, username: true } },
      products: { where: { status: 'PENDING' }, orderBy: { order: 'asc' }, take: 5 },
    },
  })
  res.json(shows)
})

// GET /shows/:id
router.get('/:id', async (req, res) => {
  const show = await prisma.show.findUnique({
    where: { id: String(req.params.id) },
    include: {
      seller: { select: { id: true, name: true, username: true } },
      products: { orderBy: { order: 'asc' } },
    },
  })
  if (!show) return res.status(404).json({ error: 'Lähetystä ei löydy' })
  res.json(show)
})

// POST /shows — luo lähetys
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, category, scheduledAt } = req.body
  if (!title) return res.status(400).json({ error: 'Nimi vaaditaan' })
  const show = await prisma.show.create({
    data: {
      title,
      category: category ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      sellerId: req.userId!,
    },
  })
  res.status(201).json(show)
})

// PATCH /shows/:id/status — muuta tila (LIVE/ENDED)
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const show = await prisma.show.findUnique({ where: { id: String(req.params.id) } })
  if (!show || show.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  const { status } = req.body
  const updated = await prisma.show.update({
    where: { id: String(req.params.id) },
    data: {
      status,
      startedAt: status === 'LIVE' ? new Date() : undefined,
      endedAt: status === 'ENDED' ? new Date() : undefined,
    },
  })
  res.json(updated)
})

export default router
