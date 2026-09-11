import { Router, Response } from 'express'
import { prisma } from '../db/prisma'

const router = Router()

// GET /ad — julkinen, etusivun mainoskaruselli (ks. CLAUDE.md "Mainostila karuselliksi"
// 2026-09-11 - aiemmin yksi rivi/null, nyt taulukko). Palauttaa vain enabled=true-mainokset,
// luontijärjestyksessä - frontend ei renderöi banneria ollenkaan jos taulukko on tyhjä.
router.get('/', async (_req, res: Response) => {
  const ads = await prisma.adSlot.findMany({ where: { enabled: true }, orderBy: { createdAt: 'asc' } })
  res.json(ads)
})

export default router
