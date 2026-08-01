import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'

const router = Router()

router.post('/register', async (req, res) => {
  const { email, password, name, username } = req.body
  if (!email || !password || !name || !username) {
    return res.status(400).json({ error: 'Täytä kaikki kentät' })
  }
  try {
    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash: hash, name, username },
    })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username } })
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
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username } })
  } catch {
    res.status(500).json({ error: 'Palvelinvirhe' })
  }
})

export default router