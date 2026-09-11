import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../db/prisma'
import { createAndSendPasswordResetToken } from '../lib/passwordReset'
import { sendWelcomeEmail } from '../lib/resend'
import { clientKey } from '../lib/clientIp'

const router = Router()

// IP-pohjainen duplikaattitilien tunnistus (ks. CLAUDE.md "Rekisteröitymisen IP-rajoitus"
// 2026-09-11, omistajan päätös kahden kysytyn vaihtoehdon välillä). Sama IP saa rekisteröidä
// rajattoman määrän tilejä - rekisteröitymistä EI koskaan estetä - mutta 4. tili ja siitä
// eteenpäin merkitään flaggedDuplicateIp:llä admin-paneelin tarkistusta varten. Ei tiukempaa
// (esim. kova esto), koska CGNAT/mobiiliverkot jakavat usein saman julkisen IP:n monen aidon,
// toisistaan riippumattoman käyttäjän kesken - kova esto olisi voinut hylätä oikeita asiakkaita.
const MAX_ACCOUNTS_PER_IP_BEFORE_FLAG = 3

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
    const ip = clientKey(req)
    const accountsFromSameIp = await prisma.user.count({ where: { registrationIp: ip } })
    const flaggedDuplicateIp = accountsFromSameIp >= MAX_ACCOUNTS_PER_IP_BEFORE_FLAG
    const user = await prisma.user.create({
      data: { email, passwordHash: hash, name, username, termsAcceptedAt: now, privacyAcceptedAt: now, policyAcceptedAt: now, registrationIp: ip, flaggedDuplicateIp },
    })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' })
    // Idempotentti käyttäjän luonnin kautta: sähköposti/käyttäjänimi on uniikki (P2002 alla
    // hoitaa duplikaatit), joten tämä koodipolku ajetaan enintään kerran per käyttäjä.
    void sendWelcomeEmail(user.email, user.name, user.username)
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl, phone: user.phone, address: user.address, postalCode: user.postalCode, city: user.city, businessId: user.businessId, usernameChangedAt: user.usernameChangedAt, role: user.role, newsletterOptIn: user.newsletterOptIn} })
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
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl, phone: user.phone, address: user.address, postalCode: user.postalCode, city: user.city, businessId: user.businessId, usernameChangedAt: user.usernameChangedAt, role: user.role, newsletterOptIn: user.newsletterOptIn} })
  } catch {
    res.status(500).json({ error: 'Palvelinvirhe' })
  }
})

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Sähköposti vaaditaan' })
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    // Vastaus on aina sama riippumatta löytyikö käyttäjä — ei paljasteta mitkä sähköpostit
    // ovat rekisteröityneet (estää tilien luettelointihyökkäyksen).
    if (user) {
      await createAndSendPasswordResetToken(user)
    }
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Palvelinvirhe' })
  }
})

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Puuttuvia kenttiä' })
  if (password.length < 8) return res.status(400).json({ error: 'Salasanan on oltava vähintään 8 merkkiä' })
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Linkki on vanhentunut tai jo käytetty' })
    }
    const hash = await bcrypt.hash(password, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: hash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Palvelinvirhe' })
  }
})

export default router