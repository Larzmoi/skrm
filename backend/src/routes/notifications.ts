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

export default router
