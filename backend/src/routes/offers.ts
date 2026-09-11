import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { notifyUser } from '../lib/notify'
import { createOrderForAuctionWin } from '../lib/auctionOrder'

const router = Router()

const OFFER_PAYMENT_WINDOW_MS = 12 * 60 * 60 * 1000 // sama 12h kuin muutkin ostajan aktiiviset ostot (LUKITTU, 2h -> 12h 2026-09-11)

// Sama Stripe-alaraja kuin products.ts:ssä (ks. sen kommentti) - hyväksytty tarjous muuttuu
// suoraan Orderiksi ja maksetaan Stripen kautta, joten tarjoushinta ei voi jäädä tämän alle.
const MIN_PRICE_EUROS = 0.5

async function isUserBanned(userId: string) {
  return prisma.ban.findFirst({ where: { userId, endsAt: { gt: new Date() } } })
}

// POST /offers — ostaja jättää tarjouksen. Vain saleType "buy_now" (ks. CLAUDE.md "Tarjoa
// hintaa — suoramyyntiin") - ei live/auction, koska niissä tarjoaminen tapahtuu jo huutamalla.
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { productId, amount } = req.body
  const numAmount = Number(amount)
  if (!productId || !isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'productId ja kelvollinen amount vaaditaan' })
  }
  if (numAmount < MIN_PRICE_EUROS) {
    return res.status(400).json({ error: `Tarjouksen tulee olla vähintään ${MIN_PRICE_EUROS.toFixed(2)}€ (Stripen maksujen alaraja)` })
  }

  const ban = await isUserBanned(req.userId!)
  if (ban) return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` })

  const product = await prisma.product.findUnique({ where: { id: String(productId) } })
  if (!product) return res.status(404).json({ error: 'Tuotetta ei löydy' })
  if (product.saleType !== 'buy_now') return res.status(400).json({ error: 'Tarjoa hintaa -toiminto on vain suoramyyntituotteille' })
  if (product.status !== 'PENDING') return res.status(400).json({ error: 'Tuote ei ole enää saatavilla' })
  if (product.sellerId === req.userId) return res.status(400).json({ error: 'Et voi tarjota omasta tuotteestasi' })

  const offer = await prisma.offer.create({
    data: { productId: product.id, buyerId: req.userId!, amount: numAmount },
  })

  const buyer = await prisma.user.findUnique({ where: { id: req.userId! }, select: { username: true } })
  await notifyUser(product.sellerId, 'OFFER_RECEIVED', 'Uusi tarjous', `${buyer?.username ?? 'Joku'} tarjosi ${numAmount}€ tuotteesta ${product.name}`, '/dashboard/tuotteet')

  res.status(201).json(offer)
})

// GET /offers/mine — ostajan omat tarjoukset
router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  const offers = await prisma.offer.findMany({
    where: { buyerId: req.userId! },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { id: true, name: true, imageUrl: true, startPrice: true, status: true, sellerId: true, seller: { select: { username: true } } } } },
  })
  res.json(offers)
})

// GET /offers/received — myyjän saapuneet tarjoukset
router.get('/received', authMiddleware, async (req: AuthRequest, res: Response) => {
  const offers = await prisma.offer.findMany({
    where: { product: { sellerId: req.userId! } },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { id: true, name: true, imageUrl: true, startPrice: true, status: true } }, buyer: { select: { username: true } } },
  })
  res.json(offers)
})

// Kelpuuttaa hyväksynnän/hylkäyksen roolin ja tilan mukaan:
// - 'pending' tarjous: vain MYYJÄ voi hyväksyä/hylätä/vastatarjota, hintana offer.amount
// - 'countered' tarjous: vain OSTAJA voi hyväksyä/hylätä myyjän vastatarjouksen, hintana offer.counterAmount
async function loadActionableOffer(id: string, userId: string) {
  const offer = await prisma.offer.findUnique({ where: { id }, include: { product: true } })
  if (!offer) return { error: 'Tarjousta ei löydy', status: 404 } as const
  const isSeller = offer.product.sellerId === userId
  const isBuyer = offer.buyerId === userId
  if (!isSeller && !isBuyer) return { error: 'Ei oikeutta', status: 403 } as const
  if (offer.status === 'pending' && !isSeller) return { error: 'Odotetaan myyjän vastausta', status: 403 } as const
  if (offer.status === 'countered' && !isBuyer) return { error: 'Odotetaan ostajan vastausta', status: 403 } as const
  if (offer.status !== 'pending' && offer.status !== 'countered') return { error: 'Tarjous ei ole enää avoinna', status: 400 } as const
  return { offer, isSeller, isBuyer } as const
}

// POST /offers/:id/accept
router.post('/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await loadActionableOffer(String(req.params.id), req.userId!)
  if ('error' in result) return res.status(result.status).json({ error: result.error })
  const { offer } = result

  const product = await prisma.product.findUnique({ where: { id: offer.productId } })
  if (!product || product.status !== 'PENDING') return res.status(400).json({ error: 'Tuote ei ole enää saatavilla' })

  const price = offer.status === 'countered' ? offer.counterAmount! : offer.amount

  // Kerätään muut juuri NYT avoinna olevat tarjoukset ETUKÄTEEN - muuten ilmoitettaisiin
  // virheellisesti myös vanhoille, jo aiemmin (eri syystä) hylätyille tarjoajille.
  const othersToDecline = await prisma.offer.findMany({
    where: { productId: product.id, id: { not: offer.id }, status: { in: ['pending', 'countered'] } },
    select: { id: true, buyerId: true },
  })

  await prisma.$transaction([
    prisma.product.update({ where: { id: product.id }, data: { status: 'SOLD', finalPrice: price } }),
    prisma.offer.update({ where: { id: offer.id }, data: { status: 'accepted', respondedAt: new Date() } }),
    // Muut samaan tuotteeseen tehdyt avoimet tarjoukset perutaan automaattisesti (ks. CLAUDE.md)
    prisma.offer.updateMany({
      where: { id: { in: othersToDecline.map(o => o.id) } },
      data: { status: 'declined', respondedAt: new Date() },
    }),
  ])

  await createOrderForAuctionWin(offer.buyerId, product.sellerId, product.id, price, OFFER_PAYMENT_WINDOW_MS)

  await notifyUser(offer.buyerId, 'OFFER_ACCEPTED', 'Tarjouksesi hyväksyttiin!', `Tarjouksesi ${price}€ tuotteesta ${product.name} hyväksyttiin. Sinulla on 12h aikaa maksaa.`, '/ostot')

  await Promise.all(othersToDecline.map(o =>
    notifyUser(o.buyerId, 'OFFER_DECLINED', 'Tarjous ei mennyt läpi', `${product.name} myytiin toiselle ostajalle.`, `/tuotteet/${product.id}`).catch(() => {})
  ))

  res.json({ ok: true, price })
})

// POST /offers/:id/decline
router.post('/:id/decline', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = await loadActionableOffer(String(req.params.id), req.userId!)
  if ('error' in result) return res.status(result.status).json({ error: result.error })
  const { offer, isSeller } = result

  await prisma.offer.update({ where: { id: offer.id }, data: { status: 'declined', respondedAt: new Date() } })

  if (isSeller) {
    await notifyUser(offer.buyerId, 'OFFER_DECLINED', 'Tarjous hylättiin', `Tarjouksesi tuotteesta ${offer.product.name} hylättiin.`, `/tuotteet/${offer.productId}`)
  }
  // Jos ostaja hylkää myyjän vastatarjouksen, myyjä ei tarvitse erillistä ilmoitusta - hän näkee tilan omassa tarjouslistassaan

  res.json({ ok: true })
})

// POST /offers/:id/counter — vain myyjä, vain 'pending'-tilaiselle tarjoukselle
router.post('/:id/counter', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { counterAmount } = req.body
  const numCounter = Number(counterAmount)
  if (!isFinite(numCounter) || numCounter <= 0) return res.status(400).json({ error: 'Kelvollinen counterAmount vaaditaan' })
  if (numCounter < MIN_PRICE_EUROS) return res.status(400).json({ error: `Vastatarjouksen tulee olla vähintään ${MIN_PRICE_EUROS.toFixed(2)}€ (Stripen maksujen alaraja)` })

  const offer = await prisma.offer.findUnique({ where: { id: String(req.params.id) }, include: { product: true } })
  if (!offer) return res.status(404).json({ error: 'Tarjousta ei löydy' })
  if (offer.product.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (offer.status !== 'pending') return res.status(400).json({ error: 'Tarjous ei ole enää avoinna' })

  const updated = await prisma.offer.update({
    where: { id: offer.id },
    data: { status: 'countered', counterAmount: numCounter, respondedAt: new Date() },
  })

  await notifyUser(offer.buyerId, 'OFFER_COUNTERED', 'Vastatarjous', `Myyjä ehdotti ${numCounter}€ hintaa tuotteesta ${offer.product.name}`, `/tuotteet/${offer.productId}`)

  res.json(updated)
})

export default router
