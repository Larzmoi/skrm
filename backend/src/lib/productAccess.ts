import { Request } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'

// Sama kevyt "lue token jos sattuu olemaan mukana" -apuri kuin users.ts:n GET /:username
// -reitillä (isFollowing) - nämä reitit (GET /products/:id, GET /auctions/:id) ovat julkisia
// (ei authMiddleware, anonyymitkin selaavat niitä), mutta jos kirjautunut käyttäjä katsoo,
// hänen identiteettinsä pitää silti tietää myyty-tuotteen näkyvyystarkistusta varten alla.
export function getOptionalUserId(req: Request): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  try {
    return (jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }).userId
  } catch {
    return null
  }
}

// Myyty tuote/huutokauppakohde piilotetaan julkisesta näkymästä — omistajan pyyntö 2026-09-12:
// jos myyjällä on useita samannäköisiä listauksia (esim. sama kortti 5 kpl eri ilmoituksina),
// myyty listaus jäi aiemmin silti julkisesti nähtäväksi (GET /products/:id ei koskaan
// tarkistanut statusta) - vain myyjä, tähän tuotteeseen liittyvän OrderItemin kautta
// tunnistettu ostaja, tai admin saa katsoa sitä enää sen jälkeen kun status on 'SOLD'.
// Kaikille muille sivu näyttää saman "ei löydy" -tilan kuin oikeasti olemattomalle tuotteelle -
// ei paljasteta ettei kyse ole pelkästä puuttuvasta ID:stä.
export async function canViewSoldProduct(
  req: Request,
  product: { sellerId: string; orderItems: { order: { buyerId: string } }[] },
): Promise<boolean> {
  const currentUserId = getOptionalUserId(req)
  if (!currentUserId) return false
  if (currentUserId === product.sellerId) return true
  if (product.orderItems.some(oi => oi.order.buyerId === currentUserId)) return true
  const user = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } })
  return user?.role === 'ADMIN'
}
