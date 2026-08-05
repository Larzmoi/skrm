import { Router, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

const RTMP_URL = process.env.RTMP_URL || 'rtmp://stream.skrm.fi/live'
const HLS_BASE_URL = process.env.HLS_BASE_URL || 'https://stream.skrm.fi/hls'

// Julkinen valinta — streamKey on salainen eikä saa koskaan päätyä julkisiin vastauksiin
const publicShowSelect = {
  id: true, title: true, sellerId: true, status: true, category: true, alakategoria: true, city: true, thumbnailUrl: true,
  hlsUrl: true, scheduledAt: true, startedAt: true, endedAt: true,
  viewerCount: true, createdAt: true,
}

// GET /shows — julkiset live ja tulevat
router.get('/', async (req, res) => {
  const { status } = req.query
  const shows = await prisma.show.findMany({
    where: status ? { status: String(status) as any } : { status: { in: ['LIVE', 'SCHEDULED'] } },
    orderBy: { scheduledAt: 'asc' },
    select: {
      ...publicShowSelect,
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
    select: {
      ...publicShowSelect,
      seller: { select: { id: true, name: true, username: true } },
      products: { orderBy: { order: 'asc' } },
    },
  })
  if (!show) return res.status(404).json({ error: 'Lähetystä ei löydy' })
  res.json(show)
})

// POST /shows — luo lähetys + generoi oma RTMP stream key (nginx-rtmp, Hetzner)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, category, alakategoria, city, scheduledAt, thumbnailUrl } = req.body
  if (!title) return res.status(400).json({ error: 'Nimi vaaditaan' })

  const streamKey = crypto.randomBytes(16).toString('hex')

  const show = await prisma.show.create({
    data: {
      title,
      category: category ?? null,
      alakategoria: alakategoria ?? null,
      city: city ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      sellerId: req.userId!,
      streamKey,
      hlsUrl: `${HLS_BASE_URL}/${streamKey}.m3u8`,
      thumbnailUrl: thumbnailUrl ?? null,
    },
  })
  res.status(201).json(show)
})

// GET /shows/:id/stream-info — hae RTMP-tiedot myyjälle (OBS-striimausta varten)
router.get('/:id/stream-info', authMiddleware, async (req: AuthRequest, res: Response) => {
  const show = await prisma.show.findUnique({ where: { id: String(req.params.id) } })
  if (!show || show.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (!show.streamKey) return res.status(404).json({ error: 'Stream keytä ei löydy tälle lähetykselle' })
  res.json({ rtmpUrl: RTMP_URL, streamKey: show.streamKey })
})

// PATCH /shows/:id/status — muuta tila (LIVE/ENDED)
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const show = await prisma.show.findUnique({ where: { id: String(req.params.id) } })
  if (!show || show.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  const { status, thumbnailUrl } = req.body
  const updated = await prisma.show.update({
    where: { id: String(req.params.id) },
    data: {
      status,
      thumbnailUrl: thumbnailUrl ?? undefined,
      startedAt: status === 'LIVE' ? new Date() : undefined,
      endedAt: status === 'ENDED' ? new Date() : undefined,
    },
  })
  res.json(updated)
})

export default router
