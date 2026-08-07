import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { notifyUser } from '../lib/notify'

const router = Router()

router.use(authMiddleware, adminMiddleware)

// GET /admin/reports?status=PENDING|REVIEWED — ilmiantolista + kohteen esikatselu
router.get('/reports', async (req: AuthRequest, res: Response) => {
  const { status } = req.query
  const where: any = {}
  if (status === 'PENDING' || status === 'REVIEWED') where.status = status

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { reporter: { select: { username: true, name: true } } },
  })

  const enriched = await Promise.all(reports.map(async (r) => {
    const target = r.targetType === 'product'
      ? await prisma.product.findUnique({ where: { id: r.targetId }, select: { id: true, name: true, sellerId: true, saleType: true } })
      : r.targetType === 'show'
      ? await prisma.show.findUnique({ where: { id: r.targetId }, select: { id: true, title: true, sellerId: true, status: true } })
      : await prisma.user.findUnique({ where: { id: r.targetId }, select: { id: true, name: true, username: true, role: true } })
    return { ...r, target }
  }))

  res.json(enriched)
})

// PATCH /admin/reports/:id — merkitse käsitellyksi
router.patch('/reports/:id', async (req, res) => {
  const report = await prisma.report.update({ where: { id: String(req.params.id) }, data: { status: 'REVIEWED' } })
  res.json(report)
})

// DELETE /admin/products/:id — poista tuote/huutokauppa, ilmoita myyjälle syy
router.delete('/products/:id', async (req, res) => {
  const id = String(req.params.id)
  const { reason } = req.body
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'Poiston syy vaaditaan' })

  const product = await prisma.product.findUnique({ where: { id }, include: { orderItems: true } })
  if (!product) return res.status(404).json({ error: 'Tuotetta ei löydy' })
  if (product.orderItems.length > 0) return res.status(400).json({ error: 'Tuote on osa tilausta, ei voida poistaa' })

  await prisma.autoBid.deleteMany({ where: { productId: id } })
  await prisma.bid.deleteMany({ where: { productId: id } })
  await prisma.cartItem.deleteMany({ where: { productId: id } })
  await prisma.message.updateMany({ where: { productId: id }, data: { productId: null } })
  await prisma.product.delete({ where: { id } })

  await notifyUser(
    product.sellerId,
    'LISTING_REMOVED',
    'Tuotteesi on poistettu',
    `Tuotteesi "${product.name}" on poistettu ylläpidon toimesta. Syy: ${reason}. Kysyttävää? support@skrm.fi`,
  )

  res.json({ ok: true })
})

// DELETE /admin/shows/:id — poista live, irrota tuotteet (jäävät olemaan), ilmoita myyjälle syy
router.delete('/shows/:id', async (req, res) => {
  const id = String(req.params.id)
  const { reason } = req.body
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'Poiston syy vaaditaan' })

  const show = await prisma.show.findUnique({ where: { id } })
  if (!show) return res.status(404).json({ error: 'Lähetystä ei löydy' })

  await prisma.product.updateMany({ where: { showId: id }, data: { showId: null } })
  await prisma.bid.deleteMany({ where: { showId: id } })
  await prisma.show.delete({ where: { id } })

  await notifyUser(
    show.sellerId,
    'LISTING_REMOVED',
    'Lähetyksesi on poistettu',
    `Lähetyksesi "${show.title}" on poistettu ylläpidon toimesta. Syy: ${reason}. Kysyttävää? support@skrm.fi`,
  )

  res.json({ ok: true })
})

// GET /admin/users?search=nimi — hae käyttäjä bannausta varten
router.get('/users', async (req, res) => {
  const { search } = req.query
  if (!search || String(search).trim().length < 2) return res.json([])
  const q = String(search).trim()
  const users = await prisma.user.findMany({
    where: { OR: [{ username: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] },
    select: { id: true, name: true, username: true, email: true, role: true },
    take: 10,
  })
  res.json(users)
})

// POST /admin/users/:id/ban — manuaalinen banni (erillinen automaattisesta maksurikebannista)
router.post('/users/:id/ban', async (req, res) => {
  const userId = String(req.params.id)
  const { reason, days } = req.body
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'Bannin syy vaaditaan' })
  const durationDays = Number(days) > 0 ? Number(days) : 30

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'Käyttäjää ei löydy' })

  const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
  const ban = await prisma.ban.create({ data: { userId, reason, endsAt } })

  await notifyUser(userId, 'BAN_ISSUED', 'Tilisi on estetty', `Tilisi on estetty ${endsAt.toLocaleDateString('fi-FI')} asti. Syy: ${reason}`)

  res.json(ban)
})

export default router
