import { Response, NextFunction } from 'express'
import { prisma } from '../db/prisma'
import { AuthRequest } from './auth'

// Käytettävä authMiddlewaren jälkeen — tarkistaa req.userId:n roolin tuoreena kannasta (JWT ei kanna roolia)
export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } })
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Ei ylläpito-oikeutta' })
  next()
}
