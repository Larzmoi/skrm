import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import * as postiClient from '../lib/postiClient'

const router = Router()

// GET /posti/pickup-points — korvaa checkoutin mock-noutopistelistan (ks. CLAUDE.md
// "48H JULKAISUPAINE" + "Pickup Point API"). Palauttaa kaikki Suomen noutopisteet, ei
// postinumerosuodatusta (POST-hakua ei ole vielä ratkaistu) - ostaja selaa/hakee itse listasta.
router.get('/pickup-points', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const points = await postiClient.getPickupPoints('FI')
    res.json(points)
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? 'Noutopisteiden haku epäonnistui' })
  }
})

export default router
