import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /users/:username — julkinen profiili
router.get('/:username', async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { username: decodeURIComponent(String(req.params.username)) },
    select: { id: true, name: true, username: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ error: 'Käyttäjää ei löydy' })
  res.json(user)
})

// PATCH /users/me — päivitä oma profiili
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, bio } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { name: name ?? undefined, bio: bio ?? undefined },
    select: { id: true, name: true, username: true, email: true, bio: true, avatarUrl: true },
  })
  res.json(user)
})

export default router
