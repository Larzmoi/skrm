import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { notifyUser } from '../lib/notify'
import { createOrderForAuctionWin } from '../lib/auctionOrder'
import { sendAuctionWonEmail } from '../lib/resend'
import { getOptionalUserId, canViewSoldProduct } from '../lib/productAccess'

const BUY_NOW_PAYMENT_WINDOW_MS = 12 * 60 * 60 * 1000 // ostaja aktiivisesti läsnä klikatessaan — maksuaika 2h -> 12h omistajan pyynnöstä 2026-09-11

const router = Router()

// Viime hetken pidennys ("anti-snipe") — omistajan pyynnöstä 2026-09-11 muutettu 2min/2min:stä
// 1min/1min:iin (ks. CLAUDE.md): jos huutokaupassa on 60s tai vähemmän jäljellä kun huuto
// tehdään, huutoaika pidennetään 60 sekuntiin siitä hetkestä.
const SNIPE_EXTENSION_MS = 60 * 1000
const SNIPE_WINDOW_MS = 60 * 1000

// Pyöristää senteille — estää JS:n liukulukutarkkuuden aiheuttamat virheet (esim. 5.1 + 0.1 = 5.199999999999999)
function roundCents(amount: number) {
  return Math.round(amount * 100) / 100
}

async function isUserBanned(userId: string) {
  const ban = await prisma.ban.findFirst({ where: { userId, endsAt: { gt: new Date() } } })
  return ban
}

// GET /auctions — hae aktiiviset huutokaupat
router.get('/', async (req, res) => {
  const { category, alakategoria, tyyppi, sort, limit } = req.query
  const now = new Date()

  const where: any = {
    saleType: 'auction',
    status: 'PENDING',
    auctionEndsAt: { gt: now },
  }
  if (category && category !== 'kaikki') where.category = String(category)
  if (alakategoria) where.alakategoria = String(alakategoria)
  if (tyyppi) where.tyyppi = String(tyyppi)

  let orderBy: any = { auctionEndsAt: 'asc' } // päättyy pian ensin
  if (sort === 'newest') orderBy = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { currentBid: 'asc' }
  if (sort === 'ending_soon') orderBy = { auctionEndsAt: 'asc' }

  const auctions = await prisma.product.findMany({
    where, orderBy, take: limit ? Number(limit) : 50,
    include: {
      seller: { select: { id: true, name: true, username: true, city: true, businessId: true, verified: true } }, // ALV-merkintä + varmennettu-merkki, ks. CLAUDE.md
      _count: { select: { bids: true } },
    },
  })

  res.json(auctions)
})

// GET /auctions/:id — yksittäinen huutokauppa + huutohistoria
router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: String(req.params.id) },
    include: {
      seller: { select: { id: true, name: true, username: true, city: true, businessId: true, verified: true } }, // ALV-merkintä + varmennettu-merkki, ks. CLAUDE.md
      bids: {
        orderBy: { amount: 'desc' },
        take: 20,
        include: { user: { select: { username: true } } },
      },
      _count: { select: { bids: true, watchers: true } },
      // Vain myyty-tuotteen näkyvyystarkistusta varten (ks. canViewSoldProduct) - ei koskaan
      // lähetetä vastauksessa sellaisenaan, siivotaan pois alla ennen res.json:ia.
      orderItems: { select: { order: { select: { buyerId: true } } } },
    },
  })

  if (!product || product.saleType !== 'auction') {
    return res.status(404).json({ error: 'Huutokauppaa ei löydy' })
  }

  // Myyty huutokauppakohde piilotetaan muilta kuin kaupan osapuolilta/adminilta - sama
  // sääntö kuin products.ts:n GET /:id:ssä, ks. CLAUDE.md "Myydyn tuotteen näkyvyys" 2026-09-12.
  if (product.status === 'SOLD' && !(await canViewSoldProduct(req, product))) {
    return res.status(404).json({ error: 'Huutokauppaa ei löydy' })
  }

  // isWatching: kertoo VAIN kirjautuneelle katsojalle onko hän itse seuraamassa tätä
  // huutokauppaa (ks. ProductWatch, "Seuraa"-nappi) — sama optional-auth-periaate kuin
  // users.ts:n GET /:username -reitin isFollowing.
  const currentUserId = getOptionalUserId(req)
  let isWatching = false
  if (currentUserId) {
    const existing = await prisma.productWatch.findUnique({
      where: { productId_userId: { productId: product.id, userId: currentUserId } },
    })
    isWatching = !!existing
  }

  const { orderItems, ...visibleProduct } = product
  res.json({ ...visibleProduct, isWatching })
})

// POST /auctions/:id/watch — seuraa/lopeta tuotteen seuraaminen (toggle), ks. CLAUDE.md
// "Huutokaupan päättymisilmoitus + tuotteen seuraaminen" 2026-09-12. Seuraajat saavat
// notifyEndingSoonAuctions()-cronin ilmoituksen 15min ennen auctionEndsAt:ia, sama kuin
// tuotteesta jo huutaneet.
router.post('/:id/watch', authMiddleware, async (req: AuthRequest, res: Response) => {
  const productId = String(req.params.id)
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.saleType !== 'auction') {
    return res.status(404).json({ error: 'Huutokauppaa ei löydy' })
  }

  const existing = await prisma.productWatch.findUnique({
    where: { productId_userId: { productId, userId: req.userId! } },
  })

  if (existing) {
    await prisma.productWatch.delete({ where: { id: existing.id } })
  } else {
    await prisma.productWatch.create({ data: { productId, userId: req.userId! } })
  }

  const watchCount = await prisma.productWatch.count({ where: { productId } })
  res.json({ watching: !existing, watchCount })
})

// POST /auctions/:id/bid — tee huuto
router.post('/:id/bid', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { amount } = req.body
  const productId = String(req.params.id)
  const now = new Date()

  const ban = await isUserBanned(req.userId!)
  if (ban) return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` })

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.saleType !== 'auction') {
    return res.status(404).json({ error: 'Huutokauppaa ei löydy' })
  }
  if (!product.auctionEndsAt || product.auctionEndsAt <= now) {
    return res.status(400).json({ error: 'Huutokauppa on päättynyt' })
  }
  if (product.sellerId === req.userId) {
    return res.status(400).json({ error: 'Et voi huutaa omaa tuotettasi' })
  }

  const minBid = roundCents((product.currentBid ?? product.startPrice) + (product.bidIncrement ?? 1))
  if (Number(amount) < minBid) {
    return res.status(400).json({ error: `Minimi huuto on ${minBid}€` })
  }

  // Viime hetken pidennys — jos alle 1 min jäljellä, lisää 1 min (estää "snipe bidding")
  let newEndsAt = product.auctionEndsAt
  const timeLeft = product.auctionEndsAt.getTime() - now.getTime()
  if (timeLeft < SNIPE_WINDOW_MS) newEndsAt = new Date(now.getTime() + SNIPE_EXTENSION_MS)

  const previousBidderId = product.currentBidderId

  await prisma.$transaction([
    prisma.bid.create({
      data: { productId, userId: req.userId!, amount: Number(amount), showId: product.showId ?? null, type: 'manual' },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { currentBid: Number(amount), currentBidderId: req.userId, auctionEndsAt: newEndsAt },
    }),
  ])

  // Ilmoita edelliselle korkeimmalle huutajalle että hänet ohitettiin
  if (previousBidderId && previousBidderId !== req.userId) {
    await notifyUser(previousBidderId, 'OUTBID', 'Sinut ohitettiin!', `Joku huusi ${amount}€ tuotteesta ${product.name}`, `/huutokauppa/${productId}`)
  }

  // Käsittele automaattihuudot
  await processAutoBids(productId)

  const updated = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: { select: { username: true } } },
  })

  res.json(updated)
})

// POST /auctions/:id/autobid — aseta automaattihuuto
router.post('/:id/autobid', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { maxAmount } = req.body
  const productId = String(req.params.id)

  const ban = await isUserBanned(req.userId!)
  if (ban) return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` })

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.saleType !== 'auction') {
    return res.status(404).json({ error: 'Huutokauppaa ei löydy' })
  }
  if (!product.auctionEndsAt || product.auctionEndsAt <= new Date()) {
    return res.status(400).json({ error: 'Huutokauppa on päättynyt' })
  }
  if (product.sellerId === req.userId) {
    return res.status(400).json({ error: 'Et voi huutaa omaa tuotettasi' })
  }

  const minBid = roundCents((product.currentBid ?? product.startPrice) + (product.bidIncrement ?? 1))
  if (Number(maxAmount) < minBid) {
    return res.status(400).json({ error: `Maksimin täytyy olla vähintään ${minBid}€` })
  }

  await prisma.autoBid.upsert({
    where: { productId_userId: { productId, userId: req.userId! } },
    create: { productId, userId: req.userId!, maxAmount: Number(maxAmount) },
    update: { maxAmount: Number(maxAmount) },
  })

  // Huuda heti jos mahdollista
  await processAutoBids(productId)

  res.json({ ok: true, maxAmount: Number(maxAmount) })
})

// POST /auctions/:id/buy-now — osta heti (ohittaa huutokaupan)
router.post('/:id/buy-now', authMiddleware, async (req: AuthRequest, res: Response) => {
  const productId = String(req.params.id)

  const ban = await isUserBanned(req.userId!)
  if (ban) return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` })

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.saleType !== 'auction') return res.status(404).json({ error: 'Huutokauppaa ei löydy' })
  if (!product.buyNowPrice) return res.status(400).json({ error: 'Osta heti -hinta ei ole saatavilla' })
  if (product.sellerId === req.userId) return res.status(400).json({ error: 'Et voi ostaa omaa tuotettasi' })
  if (product.auctionEndsAt && product.auctionEndsAt <= new Date()) return res.status(400).json({ error: 'Huutokauppa on päättynyt' })

  await prisma.product.update({
    where: { id: productId },
    data: {
      currentBid: product.buyNowPrice,
      currentBidderId: req.userId,
      auctionEndsAt: new Date(), // päättyy heti
      status: 'SOLD',
      finalPrice: product.buyNowPrice,
    },
  })

  await createOrderForAuctionWin(req.userId!, product.sellerId, productId, product.buyNowPrice, BUY_NOW_PAYMENT_WINDOW_MS)
  await notifyUser(req.userId!, 'ORDER_WON', 'Ostit tuotteen!', `Ostit tuotteen ${product.name} hintaan ${product.buyNowPrice}€. Sinulla on 12h aikaa maksaa.`, '/ostot')
  await notifyUser(product.sellerId, 'AUCTION_SOLD', 'Tuotteesi myytiin!', `${product.name} ostettiin heti hintaan ${product.buyNowPrice}€`, '/dashboard/tilaukset')
  // Sähköposti push-ilmoituksen rinnalle (ks. CLAUDE.md, sähköpostit-integraatio 2026-09-03).
  // Idempotentti: yllä oleva update asettaa auctionEndsAt:n menneisyyteen (nyt-hetkeen), joten
  // toinen /buy-now-kutsu samalle tuotteelle kaatuu heti "Huutokauppa on päättynyt" -tarkistukseen
  // (ks. `if (product.auctionEndsAt && product.auctionEndsAt <= new Date())` yllä) ennen kuin
  // pääsee tänne asti.
  const buyer = await prisma.user.findUnique({ where: { id: req.userId! }, select: { email: true, name: true } })
  if (buyer) void sendAuctionWonEmail(buyer.email, buyer.name, product.name, product.buyNowPrice, 12)

  res.json({ ok: true, price: product.buyNowPrice })
})

// Automaattihuutojen käsittely — ratkaisee koko huutosodan yhdellä laskennalla:
// voittaja on korkeimman maksimin asettanut, hinta asettuu toiseksi korkeimman maksimin + korotuksen kohdalle
// (sama periaate kuin esim. eBaylla). Ei step-by-step-rekursiota, koska se voisi vaatia tuhansia kierroksia
// jos automaattihuutojen maksimien erotus on suuri.
async function processAutoBids(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return

  const currentAmount = product.currentBid ?? product.startPrice
  const increment = product.bidIncrement ?? 1

  const [top, second] = await prisma.autoBid.findMany({
    where: { productId, maxAmount: { gt: currentAmount } },
    orderBy: { maxAmount: 'desc' },
    take: 2,
  })
  if (!top) return

  const ceiling = roundCents(Math.min(top.maxAmount, (second ? second.maxAmount : currentAmount) + increment))
  if (ceiling <= currentAmount) return

  const previousBidderId = product.currentBidderId

  await prisma.$transaction([
    prisma.bid.create({
      data: { productId, userId: top.userId, amount: ceiling, showId: product.showId ?? null, type: 'auto' },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { currentBid: ceiling, currentBidderId: top.userId },
    }),
  ])

  if (previousBidderId && previousBidderId !== top.userId) {
    await notifyUser(previousBidderId, 'OUTBID', 'Sinut ohitettiin!', `Automaattihuuto ohitti sinut tuotteesta ${product.name} — uusi huuto ${ceiling}€`, `/huutokauppa/${productId}`)
  }
}

export default router
