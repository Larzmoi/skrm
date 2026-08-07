import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

function getOptionalUserId(req: Request): string | null {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  try {
    return (jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }).userId
  } catch {
    return null
  }
}

// GET /users/:username — julkinen profiili (storefront: myyjän tiedot + tulevat lähetykset/huutokaupat)
router.get('/:username', async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { username: decodeURIComponent(String(req.params.username)) },
    select: { id: true, name: true, username: true, avatarUrl: true, createdAt: true, vacationUntil: true, vacationMessage: true },
  })
  if (!user) return res.status(404).json({ error: 'Käyttäjää ei löydy' })

  const followerCount = await prisma.follower.count({ where: { sellerId: user.id } })
  const currentUserId = getOptionalUserId(req)
  let isFollowing = false
  if (currentUserId && currentUserId !== user.id) {
    const existing = await prisma.follower.findUnique({
      where: { sellerId_followerId: { sellerId: user.id, followerId: currentUserId } },
    })
    isFollowing = !!existing
  }

  const ratingAgg = await prisma.review.aggregate({
    where: { revieweeId: user.id },
    _avg: { rating: true },
    _count: true,
  })

  const now = new Date()
  const onVacation = !!(user.vacationUntil && user.vacationUntil > now)

  const upcomingShows = await prisma.show.findMany({
    where: { sellerId: user.id, status: 'SCHEDULED' },
    orderBy: { scheduledAt: 'asc' },
    select: { id: true, title: true, thumbnailUrl: true, scheduledAt: true, category: true },
  })

  const activeAuctions = await prisma.product.findMany({
    where: { sellerId: user.id, saleType: 'auction', status: 'PENDING', auctionEndsAt: { gt: now } },
    orderBy: { auctionEndsAt: 'asc' },
    select: { id: true, name: true, imageUrl: true, currentBid: true, startPrice: true, auctionEndsAt: true },
  })

  res.json({
    ...user, followerCount, isFollowing,
    avgRating: ratingAgg._avg.rating,
    reviewCount: ratingAgg._count,
    onVacation,
    upcomingShows,
    activeAuctions,
  })
})

// GET /users/:username/reviews — julkinen lista käyttäjän saamista arvosteluista
router.get('/:username/reviews', async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { username: decodeURIComponent(String(req.params.username)) },
    select: { id: true },
  })
  if (!user) return res.status(404).json({ error: 'Käyttäjää ei löydy' })

  const reviews = await prisma.review.findMany({
    where: { revieweeId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { reviewer: { select: { name: true, username: true, avatarUrl: true } } },
  })
  res.json(reviews)
})

// POST /users/:username/follow — seuraa/lopeta seuraaminen (toggle)
router.post('/:username/follow', authMiddleware, async (req: AuthRequest, res: Response) => {
  const seller = await prisma.user.findFirst({
    where: { username: decodeURIComponent(String(req.params.username)) },
  })
  if (!seller) return res.status(404).json({ error: 'Käyttäjää ei löydy' })
  if (seller.id === req.userId) return res.status(400).json({ error: 'Et voi seurata itseäsi' })

  const existing = await prisma.follower.findUnique({
    where: { sellerId_followerId: { sellerId: seller.id, followerId: req.userId! } },
  })

  if (existing) {
    await prisma.follower.delete({ where: { id: existing.id } })
  } else {
    await prisma.follower.create({ data: { sellerId: seller.id, followerId: req.userId! } })
  }

  const followerCount = await prisma.follower.count({ where: { sellerId: seller.id } })
  res.json({ following: !existing, followerCount })
})

const USERNAME_CHANGE_COOLDOWN_DAYS = 365

// PATCH /users/me — päivitä oma profiili
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, bio, phone, address, postalCode, city, businessId, email, username, avatarUrl, vacationUntil, vacationMessage } = req.body

  const current = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!current) return res.status(404).json({ error: 'Käyttäjää ei löydy' })

  const data: any = {
    name: name ?? undefined, bio: bio ?? undefined,
    phone: phone ?? undefined, address: address ?? undefined,
    postalCode: postalCode ?? undefined, city: city ?? undefined,
    businessId: businessId ?? undefined,
    avatarUrl: avatarUrl ?? undefined,
  }

  // Lomamoodi — 'in' tarkistus koska nollaus (pois päältä) pitää voida lähettää eksplisiittisenä nullina,
  // toisin kuin muut kentät joissa ?? undefined riittää (ne eivät tarvitse "tyhjennä"-tilaa erikseen)
  if ('vacationUntil' in req.body) data.vacationUntil = vacationUntil ? new Date(vacationUntil) : null
  if ('vacationMessage' in req.body) data.vacationMessage = vacationMessage || null

  if (typeof email === 'string' && email.trim() && email.trim() !== current.email) {
    data.email = email.trim()
  }

  const trimmedUsername = typeof username === 'string' ? username.trim() : undefined
  if (trimmedUsername && trimmedUsername !== current.username) {
    if (current.usernameChangedAt) {
      const nextAllowed = new Date(current.usernameChangedAt)
      nextAllowed.setDate(nextAllowed.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS)
      if (nextAllowed > new Date()) {
        return res.status(400).json({
          error: `Käyttäjänimen voi vaihtaa kerran vuodessa. Voit vaihtaa sen taas ${nextAllowed.toLocaleDateString('fi-FI')}.`,
        })
      }
    }
    data.username = trimmedUsername
    data.usernameChangedAt = new Date()
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data,
      select: {
        id: true, name: true, username: true, email: true, bio: true, avatarUrl: true,
        phone: true, address: true, postalCode: true, city: true, businessId: true,
        usernameChangedAt: true, vacationUntil: true, vacationMessage: true,
      },
    })
    res.json(user)
  } catch (e: any) {
    if (e.code === 'P2002') {
      const target = JSON.stringify(e.meta?.target ?? '')
      if (target.includes('email')) return res.status(400).json({ error: 'Sähköposti on jo käytössä' })
      if (target.includes('username')) return res.status(400).json({ error: 'Käyttäjänimi on jo varattu' })
      return res.status(400).json({ error: 'Tieto on jo käytössä' })
    }
    res.status(500).json({ error: 'Palvelinvirhe' })
  }
})

export default router
