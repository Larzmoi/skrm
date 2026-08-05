import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'

const router = Router()

router.post('/register', async (req, res) => {
  const { email, password, name, username, termsAccepted, privacyAccepted, policyAccepted } = req.body
  if (!email || !password || !name || !username) {
    return res.status(400).json({ error: 'Täytä kaikki kentät' })
  }
  if (!termsAccepted || !privacyAccepted || !policyAccepted) {
    return res.status(400).json({ error: 'Käyttöehdot, tietosuojaseloste ja kaupankäyntipolitiikka on hyväksyttävä' })
  }
  try {
    const hash = await bcrypt.hash(password, 12)
    const now = new Date()
    const user = await prisma.user.create({
      data: { email, passwordHash: hash, name, username, termsAcceptedAt: now, privacyAcceptedAt: now, policyAcceptedAt: now },
    })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl, phone: user.phone, address: user.address, postalCode: user.postalCode, city: user.city, businessId: user.businessId, usernameChangedAt: user.usernameChangedAt} })
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Sähköposti tai käyttäjänimi on jo käytössä' })
    res.status(500).json({ error: 'Palvelinvirhe' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Väärä sähköposti tai salasana' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Väärä sähköposti tai salasana' })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl, phone: user.phone, address: user.address, postalCode: user.postalCode, city: user.city, businessId: user.businessId, usernameChangedAt: user.usernameChangedAt} })
  } catch {
    res.status(500).json({ error: 'Palvelinvirhe' })
  }
})

export default router