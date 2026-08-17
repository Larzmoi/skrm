import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /push/subscribe — tallentaa selaimen PushSubscription-olion (upsert endpointin
// mukaan, koska sama selain voi tilata uudestaan esim. avainten vaihtuessa)
router.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Virheellinen tilaus' })
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: req.userId!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: req.userId!, p256dh: keys.p256dh, auth: keys.auth },
  })
  res.status(201).json({ ok: true })
})

// POST /push/unsubscribe — poistaa tilauksen (esim. käyttäjä kytkee ilmoitukset pois)
router.post('/unsubscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ error: 'endpoint vaaditaan' })
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.userId! } })
  res.json({ ok: true })
})

export default router
