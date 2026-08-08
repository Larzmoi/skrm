import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /notifications — omat ilmoitukset, uusimmat ensin
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(notifications)
})

// POST /notifications/read — merkitse luetuksi (body { id }), tai kaikki jos id puuttuu
router.post('/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.body
  if (id) {
    await prisma.notification.updateMany({ where: { id: String(id), userId: req.userId! }, data: { read: true } })
  } else {
    await prisma.notification.updateMany({ where: { userId: req.userId!, read: false }, data: { read: true } })
  }
  res.json({ ok: true })
})

// DELETE /notifications/:id — poista oma ilmoitus listasta
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { count } = await prisma.notification.deleteMany({ where: { id: String(req.params.id), userId: req.userId! } })
  if (count === 0) return res.status(404).json({ error: 'Ilmoitusta ei löydy' })
  res.json({ ok: true })
})

export default router
