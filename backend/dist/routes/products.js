"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const notify_1 = require("../lib/notify");
const socket_1 = require("../socket");
const router = (0, express_1.Router)();
// Pyöristää senteille — sama apuri kuin auctions.ts:ssä (estää JS:n liukulukutarkkuuden
// aiheuttamat virheet, esim. 5.1 + 0.1 = 5.199999999999999).
function roundCents(amount) {
    return Math.round(amount * 100) / 100;
}
async function isUserBanned(userId) {
    const ban = await prisma_1.prisma.ban.findFirst({ where: { userId, endsAt: { gt: new Date() } } });
    return ban;
}
// GET /products
router.get('/', async (req, res) => {
    const { category, alakategoria, tyyppi, sort, search, limit, seller } = req.query;
    const where = { status: 'PENDING', saleType: { in: ['buy_now', 'both'] } };
    if (category && category !== 'kaikki')
        where.category = String(category);
    if (alakategoria)
        where.alakategoria = String(alakategoria);
    if (tyyppi)
        where.tyyppi = String(tyyppi);
    if (search)
        where.name = { contains: String(search), mode: 'insensitive' };
    // ⚠️ KRIITTINEN KORJAUS 2026-09-04: `seller`-parametri (käyttäjätunnus) oli täysin luettu
    // frontendissä (u/[username]-sivu kutsuu /products?seller=...) mutta EI KOSKAAN käsitelty
    // täällä - jokainen julkinen profiilisivu näytti siis koko sivuston tuotteet, ei vain
    // kyseisen myyjän. `sellerId` asetetaan '__none__':ksi jos käyttäjänimeä ei löydy, jotta
    // virheellinen/poistettu käyttäjänimi palauttaa tyhjän listan sen sijaan että hiljaa
    // näyttäisi kaiken (mikä olisi juuri tämä sama bugi uudestaan).
    if (seller) {
        const sellerUser = await prisma_1.prisma.user.findFirst({ where: { username: String(seller) }, select: { id: true } });
        where.sellerId = sellerUser?.id ?? '__none__';
    }
    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc')
        orderBy = { startPrice: 'asc' };
    if (sort === 'price_desc')
        orderBy = { startPrice: 'desc' };
    const products = await prisma_1.prisma.product.findMany({
        where, orderBy, take: limit ? Number(limit) : 50,
        include: { seller: { select: { id: true, name: true, username: true, city: true } } },
    });
    res.json(products);
});
// GET /products/mine
router.get('/mine', auth_1.authMiddleware, async (req, res) => {
    const products = await prisma_1.prisma.product.findMany({
        where: { sellerId: req.userId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(products);
});
// GET /products/:id
router.get('/:id', async (req, res) => {
    const id = String(req.params.id);
    const product = await prisma_1.prisma.product.findUnique({
        where: { id },
        include: {
            seller: { select: { id: true, name: true, username: true, avatarUrl: true, city: true } },
            // show.status kertoo frontendille onko tuote ennakkotarjottavissa (Show SCHEDULED,
            // ei vielä LIVE) - ks. POST /:id/prebid. bids/​_count samalla periaatteella kuin
            // auctions.ts:n GET /auctions/:id, näyttää tarjoushistorian läpinäkyvästi.
            show: { select: { id: true, status: true, scheduledAt: true, title: true } },
            bids: { orderBy: { amount: 'desc' }, take: 20, include: { user: { select: { username: true } } } },
            _count: { select: { bids: true } },
        },
    });
    if (!product)
        return res.status(404).json({ error: 'Tuotetta ei löydy' });
    res.json(product);
});
// POST /products/:id/prebid — ennakkotarjous live-tuotteelle joka ei ole vielä ollut
// huudettavana. Sallittu sekä ennen lähetyksen alkua (Show.status SCHEDULED) että LIVE-
// lähetyksen aikana jonossa oleville, vielä huutamattomille tuotteille - omistajan päätös
// 2026-08-28 ("typerää ettei voi tehdä liven aikana ennakkotarjouksia"), korjaa aiemman
// rajauksen joka salli tämän vain ennen lähetyksen alkua. EI koskaan sallittu juuri sillä
// hetkellä aktiivisena olevalle lotille (ks. isActiveLiveLot) - sen huuto menee normaalin
// socket-huutojärjestelmän (place_bid) kautta, joka pitää hinnan reaaliaikaisesti oikeana
// kaikille katsojille; tämä REST-reitti kirjoittaisi suoraan DB:hen ohi sen, mikä
// rikkoisi synkronoinnin. Kun tuotteen oma vuoro alkaa, korkein ennakkotarjous on jo
// Product.currentBid/currentBidderId - socket.ts:n start_auction jatkaa siitä normaalisti
// (ks. CLAUDE.md "Live-ominaisuudet Whatnot-tasolle" kohta 1).
router.post('/:id/prebid', auth_1.authMiddleware, async (req, res) => {
    const { amount } = req.body;
    const productId = String(req.params.id);
    const ban = await isUserBanned(req.userId);
    if (ban)
        return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` });
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId }, include: { show: true } });
    if (!product)
        return res.status(404).json({ error: 'Tuotetta ei löydy' });
    if (product.saleType !== 'live' && product.saleType !== 'both') {
        return res.status(400).json({ error: 'Tämä tuote ei ole huutokaupattavissa' });
    }
    if (product.status !== 'PENDING') {
        return res.status(400).json({ error: 'Tuote ei ole enää saatavilla' });
    }
    if (!product.show || (product.show.status !== 'SCHEDULED' && product.show.status !== 'LIVE')) {
        return res.status(400).json({ error: 'Ennakkotarjoukset eivät ole tällä hetkellä mahdollisia' });
    }
    if (product.showId && (0, socket_1.isActiveLiveLot)(product.showId, productId)) {
        return res.status(400).json({ error: 'Tämän tuotteen huutokauppa on juuri nyt käynnissä livenä - huuda livenä, ei ennakkoon' });
    }
    if (product.sellerId === req.userId) {
        return res.status(400).json({ error: 'Et voi tarjota omasta tuotteestasi' });
    }
    const minBid = roundCents((product.currentBid ?? product.startPrice) + (product.bidIncrement ?? 1));
    if (Number(amount) < minBid) {
        return res.status(400).json({ error: `Minimi tarjous on ${minBid}€` });
    }
    const previousBidderId = product.currentBidderId;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.bid.create({
            data: { productId, showId: product.showId, userId: req.userId, amount: Number(amount), type: 'manual' },
        }),
        prisma_1.prisma.product.update({
            where: { id: productId },
            data: { currentBid: Number(amount), currentBidderId: req.userId },
        }),
    ]);
    if (previousBidderId && previousBidderId !== req.userId) {
        await (0, notify_1.notifyUser)(previousBidderId, 'OUTBID', 'Sinut ohitettiin!', `Joku tarjosi ${amount}€ tuotteesta ${product.name}`, `/tuotteet/${productId}`);
    }
    const updated = await prisma_1.prisma.product.findUnique({
        where: { id: productId },
        include: {
            seller: { select: { id: true, name: true, username: true, avatarUrl: true, city: true } },
            show: { select: { id: true, status: true, scheduledAt: true, title: true } },
            bids: { orderBy: { amount: 'desc' }, take: 20, include: { user: { select: { username: true } } } },
            _count: { select: { bids: true } },
        },
    });
    res.json(updated);
});
// POST /products
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { name, saleType, startPrice, buyNowPrice, reservePrice, bidIncrement, auctionDuration, auctionDurationDays, auctionDurationHours, quantity, condition, description, imageUrl, category, alakategoria, tyyppi, city, allowPickup, allowShipping, showId } = req.body;
    if (!name || !startPrice)
        return res.status(400).json({ error: 'Nimi ja hinta vaaditaan' });
    // showId tuli suoraan pyynnön bodystä ilman omistajuustarkistusta - kuka tahansa kirjautunut
    // käyttäjä pystyi liittämään oman tuotteensa TOISEN myyjän lähetyksen jonoon (löytyi
    // 2026-08-28 pre-bid-testauksen sivutuotteena). Sallittu vain kun show on olemassa ja
    // kuuluu pyynnön tekijälle.
    if (showId) {
        const targetShow = await prisma_1.prisma.show.findUnique({ where: { id: String(showId) }, select: { sellerId: true } });
        if (!targetShow || targetShow.sellerId !== req.userId) {
            return res.status(403).json({ error: 'Et voi lisätä tuotetta tähän lähetykseen' });
        }
    }
    // Perinteinen huutokauppa: auctionDurationDays/Hours on kesto luontihetkellä, ei tallenneta sellaisenaan —
    // vain päättymisajankohta persistoidaan (eri asia kuin live-lotin auctionDuration, joka on sekunteina)
    const MAX_AUCTION_HOURS = 30 * 24;
    let auctionEndsAt;
    if (saleType === 'auction') {
        const totalHours = Math.min(MAX_AUCTION_HOURS, Math.max(1, (Number(auctionDurationDays) || 0) * 24 + (Number(auctionDurationHours) || 0)));
        auctionEndsAt = new Date(Date.now() + totalHours * 60 * 60 * 1000);
    }
    const product = await prisma_1.prisma.product.create({
        data: {
            name, saleType: saleType ?? 'live',
            startPrice: Number(startPrice),
            buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
            reservePrice: reservePrice ? Number(reservePrice) : null,
            bidIncrement: bidIncrement ? Number(bidIncrement) : null,
            auctionDuration: auctionDuration ? Number(auctionDuration) : null,
            auctionEndsAt,
            quantity: Number(quantity ?? 1),
            condition: condition ?? null, description: description ?? null,
            imageUrl: imageUrl ?? null, category: category ?? null,
            alakategoria: alakategoria ?? null, tyyppi: tyyppi ?? null, city: city ?? null,
            allowPickup: allowPickup !== false, allowShipping: allowShipping !== false,
            sellerId: req.userId, showId: showId ?? null,
        },
    });
    // Katsojan Shop-paneeli seuraa GET /shows/:id:n products-relaatiota (ei myyjän omaa
    // paikallista tilaa) - ilman tätä myyjän live-konsolista lisätty tuote ei näkynyt
    // muille kuin striimaavalle laitteelle ennen sivun uudelleenlatausta.
    if (product.showId)
        (0, notify_1.emitToShow)(product.showId, 'products_updated', {});
    res.status(201).json(product);
});
// POST /products/bulk — monimuu-tuonti (CSV/TXT-liite tai liitetty teksti, jäsennetty jo
// frontendissä: nimi/kunto/[valinnainen kommentti]/hinta/määrä, rivimäärä per tuote vaihtelee
// 4-5 riippuen onko kommenttia — ks. CLAUDE.md "Bulkkiparserin kommenttirivi-puute 2026-09-02").
// Myyntitapa (saleType) koskee koko erää, ei ole per-rivi valittavissa — 'buy_now' (oletus, pelkkä
// suoramyynti) tai 'both' (myös live-jonoon liitettävissä). Erän tasolla valittavaksi nimenomaan
// siksi ettei 1000 tuotteen erästä tarvitse jälkikäteen karsia livetuotteita erikseen muokkaamalla
// jokaista yksitellen — myyjä valitsee kerralla ennen tallennusta, muokkaus onnistuu silti
// jälkikäteen per tuote jos yksittäinen rivi pitää vaihtaa myöhemmin.
router.post('/bulk', auth_1.authMiddleware, async (req, res) => {
    const { products, category, alakategoria, tyyppi, saleType } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: 'Tuotteita ei annettu' });
    }
    if (products.length > 500) {
        return res.status(400).json({ error: 'Kerralla voi tuoda enintään 500 tuotetta' });
    }
    // Kategoria/peli/tyyppi koskee koko erää (esim. "Pokémon Irtokortit") - liitetty teksti on
    // käytännössä aina yhtä settiä/tyyppiä, ei per-rivi valittavissa. tyyppi ratkaisee mm. mikä
    // kuntoluokitusjärjestelmä pätee (ks. CLAUDE.md "Kuntoluokitus Cardmarket-muotoon irtokorteille").
    const batchCategory = typeof category === 'string' && category ? category : null;
    const batchAlakategoria = typeof alakategoria === 'string' && alakategoria ? alakategoria : null;
    const batchTyyppi = typeof tyyppi === 'string' && tyyppi ? tyyppi : null;
    const batchSaleType = saleType === 'both' ? 'both' : 'buy_now';
    let created = 0;
    let skipped = 0;
    const results = [];
    for (const p of products) {
        const name = typeof p?.name === 'string' ? p.name.trim() : '';
        const startPrice = Number(p?.startPrice);
        if (!name || !isFinite(startPrice) || startPrice <= 0) {
            skipped++;
            results.push({ name: name || '(tuntematon)', skipped: true, error: 'Puuttuva nimi tai virheellinen hinta' });
            continue;
        }
        const quantity = Number(p?.quantity);
        const product = await prisma_1.prisma.product.create({
            data: {
                name, saleType: batchSaleType,
                startPrice: roundCents(startPrice),
                quantity: isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
                condition: typeof p?.condition === 'string' && p.condition ? p.condition : null,
                description: typeof p?.description === 'string' && p.description.trim() ? p.description.trim() : null,
                category: batchCategory, alakategoria: batchAlakategoria, tyyppi: batchTyyppi,
                sellerId: req.userId,
            },
        });
        created++;
        results.push({ name: product.name, created: true, id: product.id });
    }
    res.status(201).json({ created, skipped, total: products.length, results });
});
// PUT /products/:id
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    const id = String(req.params.id);
    const product = await prisma_1.prisma.product.findUnique({ where: { id } });
    if (!product || product.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    // Perinteinen huutokauppa jolla on jo huutoja: kategoriaa ei saa enää vaihtaa kesken huutokaupan —
    // bidaajat ovat voineet löytää/huutaa tuotteen juuri sen kategorian perusteella.
    const newCategory = req.body.category ?? null;
    const newAlakategoria = req.body.alakategoria ?? null;
    const newTyyppi = req.body.tyyppi ?? null;
    const categoryChanged = newCategory !== product.category || newAlakategoria !== product.alakategoria || newTyyppi !== product.tyyppi;
    if (categoryChanged && product.saleType === 'auction' && product.currentBid != null) {
        return res.status(400).json({ error: 'Kategoriaa ei voi enää muuttaa — huutokauppa on jo käynnissä' });
    }
    const updated = await prisma_1.prisma.product.update({
        where: { id },
        data: {
            name: req.body.name, saleType: req.body.saleType,
            startPrice: req.body.startPrice ? Number(req.body.startPrice) : undefined,
            buyNowPrice: req.body.buyNowPrice ? Number(req.body.buyNowPrice) : null,
            reservePrice: req.body.reservePrice ? Number(req.body.reservePrice) : null,
            bidIncrement: req.body.bidIncrement ? Number(req.body.bidIncrement) : null,
            auctionDuration: req.body.auctionDuration ? Number(req.body.auctionDuration) : null,
            quantity: req.body.quantity ? Number(req.body.quantity) : undefined,
            condition: req.body.condition ?? null, description: req.body.description ?? null,
            imageUrl: req.body.imageUrl ?? undefined, category: newCategory,
            alakategoria: newAlakategoria, tyyppi: newTyyppi, city: req.body.city ?? null,
            allowPickup: req.body.allowPickup !== false, allowShipping: req.body.allowShipping !== false,
        },
    });
    res.json(updated);
});
// DELETE /products/:id
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    const id = String(req.params.id);
    const product = await prisma_1.prisma.product.findUnique({ where: { id }, include: { orderItems: { include: { order: true } } } });
    if (!product || product.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    // KORJAUS 2026-08-14 (omistajan löytämä epäjohdonmukaisuus): maksamattoman tilauksen
    // eräännyttyä (ks. webhooks.ts checkExpiredPayments) tuote palautuu PENDING-tilaan ja
    // näkyy taas Aktiiviset-listassa/on muokattavissa - mutta itse (peruutettu) Order-rivi
    // ja siihen liittyvä OrderItem eivät poistu, vain merkitään CANCELLED. Tuote näytti siis
    // täysin aktiiviselta muttei silti voinut poistaa, koska tarkistus laski MYÖS peruutetun
    // tilauksen "osaksi tilausta". Peruutetun tilauksen rivi ei edusta oikeaa rahaliikennettä
    // (maksu ei koskaan mennyt läpi) - vain ei-peruutetut tilaukset estävät poiston.
    const realOrderItems = product.orderItems.filter(oi => oi.order.status !== 'CANCELLED');
    if (realOrderItems.length > 0)
        return res.status(400).json({ error: 'Tuote on osa tilausta, ei voida poistaa' });
    // Perinteinen huutokauppa: ei voi poistaa jos varaushinta on jo ylittynyt (tai jos ei varaushintaa
    // ollenkaan ja huuto on jo tullut) — huuto on silloin LUKITTU-säännön mukaisesti sitova.
    if (product.saleType === 'auction' && product.currentBid != null && (!product.reservePrice || product.currentBid >= product.reservePrice)) {
        return res.status(400).json({ error: 'Tuotetta ei voi poistaa — varaushinta on ylittynyt, huuto on sitova' });
    }
    await prisma_1.prisma.autoBid.deleteMany({ where: { productId: id } });
    await prisma_1.prisma.bid.deleteMany({ where: { productId: id } });
    await prisma_1.prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma_1.prisma.message.updateMany({ where: { productId: id }, data: { productId: null } });
    // Peruutetun tilauksen OrderItem-rivit (ks. yllä) pitää siivota ennen poistoa, muuten
    // Product.delete() kaatuisi FK-rajoitteeseen (OrderItem.productId ei ole nullable).
    await prisma_1.prisma.orderItem.deleteMany({ where: { productId: id, order: { status: 'CANCELLED' } } });
    await prisma_1.prisma.product.delete({ where: { id } });
    res.json({ ok: true });
});
exports.default = router;
