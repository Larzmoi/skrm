"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const notify_1 = require("../lib/notify");
const auctionOrder_1 = require("../lib/auctionOrder");
const resend_1 = require("../lib/resend");
const BUY_NOW_PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000; // ostaja aktiivisesti läsnä klikatessaan — normaali 2h maksuaika
const router = (0, express_1.Router)();
const SNIPE_EXTENSION_MS = 2 * 60 * 1000; // viime hetken pidennys
const SNIPE_WINDOW_MS = 2 * 60 * 1000;
// Pyöristää senteille — estää JS:n liukulukutarkkuuden aiheuttamat virheet (esim. 5.1 + 0.1 = 5.199999999999999)
function roundCents(amount) {
    return Math.round(amount * 100) / 100;
}
async function isUserBanned(userId) {
    const ban = await prisma_1.prisma.ban.findFirst({ where: { userId, endsAt: { gt: new Date() } } });
    return ban;
}
// GET /auctions — hae aktiiviset huutokaupat
router.get('/', async (req, res) => {
    const { category, alakategoria, tyyppi, sort, limit } = req.query;
    const now = new Date();
    const where = {
        saleType: 'auction',
        status: 'PENDING',
        auctionEndsAt: { gt: now },
    };
    if (category && category !== 'kaikki')
        where.category = String(category);
    if (alakategoria)
        where.alakategoria = String(alakategoria);
    if (tyyppi)
        where.tyyppi = String(tyyppi);
    let orderBy = { auctionEndsAt: 'asc' }; // päättyy pian ensin
    if (sort === 'newest')
        orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc')
        orderBy = { currentBid: 'asc' };
    if (sort === 'ending_soon')
        orderBy = { auctionEndsAt: 'asc' };
    const auctions = await prisma_1.prisma.product.findMany({
        where, orderBy, take: limit ? Number(limit) : 50,
        include: {
            seller: { select: { id: true, name: true, username: true, city: true, businessId: true } }, // ALV-merkintä, ks. CLAUDE.md "ALV yritysmyyjille"
            _count: { select: { bids: true } },
        },
    });
    res.json(auctions);
});
// GET /auctions/:id — yksittäinen huutokauppa + huutohistoria
router.get('/:id', async (req, res) => {
    const product = await prisma_1.prisma.product.findUnique({
        where: { id: String(req.params.id) },
        include: {
            seller: { select: { id: true, name: true, username: true, city: true, businessId: true } }, // ALV-merkintä, ks. CLAUDE.md "ALV yritysmyyjille"
            bids: {
                orderBy: { amount: 'desc' },
                take: 20,
                include: { user: { select: { username: true } } },
            },
            _count: { select: { bids: true } },
        },
    });
    if (!product || product.saleType !== 'auction') {
        return res.status(404).json({ error: 'Huutokauppaa ei löydy' });
    }
    res.json(product);
});
// POST /auctions/:id/bid — tee huuto
router.post('/:id/bid', auth_1.authMiddleware, async (req, res) => {
    const { amount } = req.body;
    const productId = String(req.params.id);
    const now = new Date();
    const ban = await isUserBanned(req.userId);
    if (ban)
        return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` });
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.saleType !== 'auction') {
        return res.status(404).json({ error: 'Huutokauppaa ei löydy' });
    }
    if (!product.auctionEndsAt || product.auctionEndsAt <= now) {
        return res.status(400).json({ error: 'Huutokauppa on päättynyt' });
    }
    if (product.sellerId === req.userId) {
        return res.status(400).json({ error: 'Et voi huutaa omaa tuotettasi' });
    }
    const minBid = roundCents((product.currentBid ?? product.startPrice) + (product.bidIncrement ?? 1));
    if (Number(amount) < minBid) {
        return res.status(400).json({ error: `Minimi huuto on ${minBid}€` });
    }
    // Viime hetken pidennys — jos alle 2 min jäljellä, lisää 2 min (estää "snipe bidding")
    let newEndsAt = product.auctionEndsAt;
    const timeLeft = product.auctionEndsAt.getTime() - now.getTime();
    if (timeLeft < SNIPE_WINDOW_MS)
        newEndsAt = new Date(now.getTime() + SNIPE_EXTENSION_MS);
    const previousBidderId = product.currentBidderId;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.bid.create({
            data: { productId, userId: req.userId, amount: Number(amount), showId: product.showId ?? null, type: 'manual' },
        }),
        prisma_1.prisma.product.update({
            where: { id: productId },
            data: { currentBid: Number(amount), currentBidderId: req.userId, auctionEndsAt: newEndsAt },
        }),
    ]);
    // Ilmoita edelliselle korkeimmalle huutajalle että hänet ohitettiin
    if (previousBidderId && previousBidderId !== req.userId) {
        await (0, notify_1.notifyUser)(previousBidderId, 'OUTBID', 'Sinut ohitettiin!', `Joku huusi ${amount}€ tuotteesta ${product.name}`, `/huutokauppa/${productId}`);
    }
    // Käsittele automaattihuudot
    await processAutoBids(productId);
    const updated = await prisma_1.prisma.product.findUnique({
        where: { id: productId },
        include: { seller: { select: { username: true } } },
    });
    res.json(updated);
});
// POST /auctions/:id/autobid — aseta automaattihuuto
router.post('/:id/autobid', auth_1.authMiddleware, async (req, res) => {
    const { maxAmount } = req.body;
    const productId = String(req.params.id);
    const ban = await isUserBanned(req.userId);
    if (ban)
        return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` });
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.saleType !== 'auction') {
        return res.status(404).json({ error: 'Huutokauppaa ei löydy' });
    }
    if (!product.auctionEndsAt || product.auctionEndsAt <= new Date()) {
        return res.status(400).json({ error: 'Huutokauppa on päättynyt' });
    }
    if (product.sellerId === req.userId) {
        return res.status(400).json({ error: 'Et voi huutaa omaa tuotettasi' });
    }
    const minBid = roundCents((product.currentBid ?? product.startPrice) + (product.bidIncrement ?? 1));
    if (Number(maxAmount) < minBid) {
        return res.status(400).json({ error: `Maksimin täytyy olla vähintään ${minBid}€` });
    }
    await prisma_1.prisma.autoBid.upsert({
        where: { productId_userId: { productId, userId: req.userId } },
        create: { productId, userId: req.userId, maxAmount: Number(maxAmount) },
        update: { maxAmount: Number(maxAmount) },
    });
    // Huuda heti jos mahdollista
    await processAutoBids(productId);
    res.json({ ok: true, maxAmount: Number(maxAmount) });
});
// POST /auctions/:id/buy-now — osta heti (ohittaa huutokaupan)
router.post('/:id/buy-now', auth_1.authMiddleware, async (req, res) => {
    const productId = String(req.params.id);
    const ban = await isUserBanned(req.userId);
    if (ban)
        return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` });
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.saleType !== 'auction')
        return res.status(404).json({ error: 'Huutokauppaa ei löydy' });
    if (!product.buyNowPrice)
        return res.status(400).json({ error: 'Osta heti -hinta ei ole saatavilla' });
    if (product.sellerId === req.userId)
        return res.status(400).json({ error: 'Et voi ostaa omaa tuotettasi' });
    if (product.auctionEndsAt && product.auctionEndsAt <= new Date())
        return res.status(400).json({ error: 'Huutokauppa on päättynyt' });
    await prisma_1.prisma.product.update({
        where: { id: productId },
        data: {
            currentBid: product.buyNowPrice,
            currentBidderId: req.userId,
            auctionEndsAt: new Date(), // päättyy heti
            status: 'SOLD',
            finalPrice: product.buyNowPrice,
        },
    });
    await (0, auctionOrder_1.createOrderForAuctionWin)(req.userId, product.sellerId, productId, product.buyNowPrice, BUY_NOW_PAYMENT_WINDOW_MS);
    await (0, notify_1.notifyUser)(req.userId, 'ORDER_WON', 'Ostit tuotteen!', `Ostit tuotteen ${product.name} hintaan ${product.buyNowPrice}€. Sinulla on 2h aikaa maksaa.`, '/ostot');
    await (0, notify_1.notifyUser)(product.sellerId, 'AUCTION_SOLD', 'Tuotteesi myytiin!', `${product.name} ostettiin heti hintaan ${product.buyNowPrice}€`, '/dashboard/tilaukset');
    // Sähköposti push-ilmoituksen rinnalle (ks. CLAUDE.md, sähköpostit-integraatio 2026-09-03).
    // Idempotentti: yllä oleva update asettaa auctionEndsAt:n menneisyyteen (nyt-hetkeen), joten
    // toinen /buy-now-kutsu samalle tuotteelle kaatuu heti "Huutokauppa on päättynyt" -tarkistukseen
    // (ks. `if (product.auctionEndsAt && product.auctionEndsAt <= new Date())` yllä) ennen kuin
    // pääsee tänne asti.
    const buyer = await prisma_1.prisma.user.findUnique({ where: { id: req.userId }, select: { email: true, name: true } });
    if (buyer)
        void (0, resend_1.sendAuctionWonEmail)(buyer.email, buyer.name, product.name, product.buyNowPrice, 2);
    res.json({ ok: true, price: product.buyNowPrice });
});
// Automaattihuutojen käsittely — ratkaisee koko huutosodan yhdellä laskennalla:
// voittaja on korkeimman maksimin asettanut, hinta asettuu toiseksi korkeimman maksimin + korotuksen kohdalle
// (sama periaate kuin esim. eBaylla). Ei step-by-step-rekursiota, koska se voisi vaatia tuhansia kierroksia
// jos automaattihuutojen maksimien erotus on suuri.
async function processAutoBids(productId) {
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product)
        return;
    const currentAmount = product.currentBid ?? product.startPrice;
    const increment = product.bidIncrement ?? 1;
    const [top, second] = await prisma_1.prisma.autoBid.findMany({
        where: { productId, maxAmount: { gt: currentAmount } },
        orderBy: { maxAmount: 'desc' },
        take: 2,
    });
    if (!top)
        return;
    const ceiling = roundCents(Math.min(top.maxAmount, (second ? second.maxAmount : currentAmount) + increment));
    if (ceiling <= currentAmount)
        return;
    const previousBidderId = product.currentBidderId;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.bid.create({
            data: { productId, userId: top.userId, amount: ceiling, showId: product.showId ?? null, type: 'auto' },
        }),
        prisma_1.prisma.product.update({
            where: { id: productId },
            data: { currentBid: ceiling, currentBidderId: top.userId },
        }),
    ]);
    if (previousBidderId && previousBidderId !== top.userId) {
        await (0, notify_1.notifyUser)(previousBidderId, 'OUTBID', 'Sinut ohitettiin!', `Automaattihuuto ohitti sinut tuotteesta ${product.name} — uusi huuto ${ceiling}€`, `/huutokauppa/${productId}`);
    }
}
exports.default = router;
