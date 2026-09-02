import crypto from 'crypto'
import { prisma } from '../db/prisma'
import { sendPasswordResetEmail } from './resend'

// Jaettu apuri sekä /auth/forgot-password:lle (käyttäjä pyytää itse) että admin-paneelin
// "Lähetä salasanan palautuslinkki" -napille (POST /admin/users/:id/send-password-reset) —
// sama token-luonti- ja lähetyslogiikka, ei kahta eri koodausta samalle asialle.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export async function createAndSendPasswordResetToken(user: { id: string; email: string; name: string }) {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  })
  const resetUrl = `${FRONTEND_URL}/nollaa-salasana?token=${rawToken}`
  await sendPasswordResetEmail(user.email, user.name, resetUrl)
}
