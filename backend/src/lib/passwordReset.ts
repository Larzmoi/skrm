import crypto from 'crypto'
import { prisma } from '../db/prisma'
import { sendPasswordResetEmail } from './resend'

// Jaettu apuri sekä /auth/forgot-password:lle (käyttäjä pyytää itse) että admin-paneelin
// "Lähetä salasanan palautuslinkki" -napille (POST /admin/users/:id/send-password-reset) —
// sama token-luonti- ja lähetyslogiikka, ei kahta eri koodausta samalle asialle.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// KORJATTU 2026-09-04 (ks. CLAUDE.md "48H JULKAISUPAINE" + salasanan palautus -tutkinta):
// poistettu deleteMany({usedAt:null}) joka mitätöi käyttäjän KAIKKI aiemmat käyttämättömät
// tokenit heti uutta pyydettäessä. Vahvistettu tuotannon tietokannasta + suoralla testillä
// että tämä aiheutti täsmälleen raportoidun "linkki näyttää vanhentuneelta" -oireen: jos
// käyttäjä pyysi palautuslinkin kahdesti (esim. kärsimättömyyttä tai luullen ettei
// ensimmäinen saapunut) ja klikkasi sitten VANHEMPAA sähköpostia, se linkki oli jo mitätöity
// sekunteja/minuutteja aiemmin uuden pyynnön yhteydessä — käyttäjä näki "vanhentunut tai jo
// käytetty" -virheen vaikka linkki oli aivan tuore hänen näkökulmastaan. Jokainen token on
// yhä itsenäisesti 1h voimassa ja kertakäyttöinen (usedAt asetetaan onnistuneen käytön
// jälkeen) - ainoa muutos on ettei UUSI pyyntö enää mitätöi VANHOJA, joten mikä tahansa
// vastaanotetuista sähköposteista toimii niin kauan kuin sen oma tunti ei ole kulunut.
export async function createAndSendPasswordResetToken(user: { id: string; email: string; name: string }) {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  })
  const resetUrl = `${FRONTEND_URL}/nollaa-salasana?token=${rawToken}`
  await sendPasswordResetEmail(user.email, user.name, resetUrl)
}
