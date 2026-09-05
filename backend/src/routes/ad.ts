import { Router, Response } from 'express'
import { prisma } from '../db/prisma'

const router = Router()

// GET /ad — julkinen, etusivun mainosbannerin sisältö (ks. CLAUDE.md "Iso testauskierros
// 2026-09-04" kohta 6). Palauttaa null jos riviä ei ole vielä luotu tai enabled=false —
// frontend ei renderöi banneria ollenkaan silloin.
router.get('/', async (_req, res: Response) => {
  const ad = await prisma.adSlot.findUnique({ where: { id: 'main' } })
  if (!ad || !ad.enabled) return res.json(null)
  res.json(ad)
})

export default router
