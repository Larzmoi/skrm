"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const shipping_1 = require("../lib/shipping");
const router = (0, express_1.Router)();
const LIVE_ITEM_WINDOW_MS = 2 * 60 * 60 * 1000; // 2h
const SHIPPING_MERGE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h
// Live-ostosten CartItemit vanhenevat 2h addedAt:sta. Poistaa vanhentuneet
// ja palauttaa niiden määrän takaisin tuotteen saatavaan varastoon.
async function reapExpiredCartItems(buyerId) {
    const cart = await prisma_1.prisma.cart.findFirst({ where: { buyerId }, include: { items: true } });
    if (!cart)
        return;
    const now = Date.now();
    const expired = cart.items.filter(i => i.source === 'live' && now - i.addedAt.getTime() > LIVE_ITEM_WINDOW_MS);
    if (expired.length === 0)
        return;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.cartItem.deleteMany({ where: { id: { in: expired.map(i => i.id) } } }),
        ...expired.map(i => prisma_1.prisma.product.update({
            where: { id: i.productId },
            data: { quantity: { increment: i.quantity }, status: 'PENDING' },
        })),
    ]);
    const remaining = await prisma_1.prisma.cartItem.count({ where: { cartId: cart.id } });
    if (remaining === 0)
        await prisma_1.prisma.cart.delete({ where: { id: cart.id } });
}
async function isUserBanned(userId) {
    const ban = await prisma_1.prisma.ban.findFirst({ where: { userId, endsAt: { gt: new Date() } } });
    return ban;
}
// POST /cart/add — lisää tuote koriin
router.post('/add', auth_1.authMiddleware, async (req, res) => {
    const buyerId = req.userId;
    const { productId, source } = req.body;
    const quantity = Math.max(1, Math.floor(Number(req.body.quantity) || 1));
    if (!productId || (source !== 'live' && source !== 'direct')) {
        return res.status(400).json({ error: 'productId ja source (live/direct) vaaditaan' });
    }
    const ban = await isUserBanned(buyerId);
    if (ban)
        return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` });
    await reapExpiredCartItems(buyerId);
    const product = await prisma_1.prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product)
        return res.status(404).json({ error: 'Tuotetta ei löydy' });
    if (product.status !== 'PENDING')
        return res.status(400).json({ error: 'Tuote ei ole enää saatavilla' });
    if (product.sellerId === buyerId)
        return res.status(400).json({ error: 'Et voi ostaa omaa tuotettasi' });
    if (product.quantity < quantity)
        return res.status(400).json({ error: `Tuotetta on saatavilla vain ${product.quantity} kpl` });
    const price = source === 'live' ? (product.finalPrice ?? product.startPrice) : (product.buyNowPrice ?? product.startPrice);
    let cart = await prisma_1.prisma.cart.findFirst({ where: { buyerId } });
    const farFuture = new Date(Date.now() + LIVE_ITEM_WINDOW_MS);
    if (!cart) {
        cart = await prisma_1.prisma.cart.create({ data: { buyerId, expiresAt: farFuture } });
    }
    else if (source === 'live') {
        // Pidä Cart.expiresAt ajantasalla lähimmän live-tuotteen vanhenemiselle
        await prisma_1.prisma.cart.update({ where: { id: cart.id }, data: { expiresAt: farFuture } });
    }
    // Vähennä varastosta atomisesti — updateMany:n where-ehto estää ylivarauksen kilpailevissa pyynnöissä
    const reserved = await prisma_1.prisma.product.updateMany({
        where: { id: product.id, status: 'PENDING', quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
    });
    if (reserved.count === 0)
        return res.status(400).json({ error: 'Tuotetta ei ole enää tarpeeksi saatavilla' });
    const afterReserve = await prisma_1.prisma.product.findUnique({ where: { id: product.id } });
    if (afterReserve && afterReserve.quantity <= 0) {
        await prisma_1.prisma.product.update({ where: { id: product.id }, data: { status: 'RESERVED' } });
    }
    await prisma_1.prisma.cartItem.create({
        data: { cartId: cart.id, productId: product.id, price, sellerId: product.sellerId, source, quantity },
    });
    res.status(201).json({ ok: true });
});
// GET /cart — hae ostoskori ryhmiteltynä myyjittäin
router.get('/', auth_1.authMiddleware, async (req, res) => {
    const buyerId = req.userId;
    await reapExpiredCartItems(buyerId);
    const cart = await prisma_1.prisma.cart.findFirst({
        where: { buyerId },
        include: {
            items: {
                include: {
                    product: { include: { seller: { select: { id: true, name: true, username: true } } } },
                },
                orderBy: { addedAt: 'asc' },
            },
        },
    });
    if (!cart || cart.items.length === 0)
        return res.json({ groups: [], pakettikoot: shipping_1.PAKETTIKOOT });
    const bySeller = new Map();
    for (const item of cart.items) {
        const list = bySeller.get(item.sellerId) ?? [];
        list.push(item);
        bySeller.set(item.sellerId, list);
    }
    const groups = Array.from(bySeller.entries()).map(([sellerId, items]) => {
        const seller = items[0].product.seller;
        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        // Koko ryhmä jakaa yhden toimitustavan (yksi Order, yksi shippingSize) - jos yksikin tuote
        // rajaa jommankumman tavan pois (allowPickup/allowShipping === false), koko ryhmä ei voi
        // enää tarjota sitä tapaa. Sama tie-break-periaate kuin ennen (postitus oletuksena jos
        // molemmat sallittuja) - vain lähde vaihtui pakollisesta pakettikoko-merkkijonosta näihin
        // kahteen valinnaiseen boolean-kenttään (ks. CLAUDE.md "Kaksi UX-löydöstä 2026-09-02" kohta 2).
        const allowShipping = items.every(i => i.product.allowShipping);
        const allowPickup = items.every(i => i.product.allowPickup);
        const suggestedPakettikoko = allowShipping ? 'postitus' : (allowPickup ? 'nouto' : null);
        return {
            sellerId,
            seller: { name: seller.name, username: seller.username },
            items: items.map(i => ({
                id: i.id, productId: i.productId, name: i.product.name,
                imageUrl: i.product.imageUrl?.split('|||')[0] ?? null,
                price: i.price, quantity: i.quantity, source: i.source, addedAt: i.addedAt,
                expiresAt: i.source === 'live' ? new Date(i.addedAt.getTime() + LIVE_ITEM_WINDOW_MS) : null,
            })),
            total,
            suggestedPakettikoko,
            allowShipping,
            allowPickup,
        };
    });
    res.json({ groups, pakettikoot: shipping_1.PAKETTIKOOT });
});
// DELETE /cart/:itemId — poista korista
router.delete('/:itemId', auth_1.authMiddleware, async (req, res) => {
    const buyerId = req.userId;
    const item = await prisma_1.prisma.cartItem.findUnique({ where: { id: String(req.params.itemId) }, include: { cart: true } });
    if (!item || item.cart.buyerId !== buyerId)
        return res.status(404).json({ error: 'Riviä ei löydy' });
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.cartItem.delete({ where: { id: item.id } }),
        prisma_1.prisma.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity }, status: 'PENDING' } }),
    ]);
    const remaining = await prisma_1.prisma.cartItem.count({ where: { cartId: item.cartId } });
    if (remaining === 0)
        await prisma_1.prisma.cart.delete({ where: { id: item.cartId } }).catch(() => { });
    res.json({ ok: true });
});
// POST /cart/checkout — luo tilaus yhdelle myyjälle korissa olevista tuotteista
router.post('/checkout', auth_1.authMiddleware, async (req, res) => {
    const buyerId = req.userId;
    const { sellerId } = req.body;
    if (!sellerId)
        return res.status(400).json({ error: 'sellerId vaaditaan' });
    const ban = await isUserBanned(buyerId);
    if (ban)
        return res.status(403).json({ error: `Tilisi on estetty ${ban.endsAt.toLocaleDateString('fi-FI')} asti: ${ban.reason}` });
    await reapExpiredCartItems(buyerId);
    const cart = await prisma_1.prisma.cart.findFirst({ where: { buyerId }, include: { items: { where: { sellerId: String(sellerId) } } } });
    if (!cart || cart.items.length === 0)
        return res.status(400).json({ error: 'Ei tuotteita tältä myyjältä korissa' });
    const items = cart.items;
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    // Yhdistetty lähetys: sama myyjä 6h sisällä JA tilaus ei ole vielä maksettu → liitetään
    // avoimeen tilaukseen. Omistajan korjaus 2026-08-12: tuote+toimitus maksetaan aina YHDESSÄ
    // yhtenä Paytrail-maksuna, joten yhdistäminen voi tapahtua vain ENNEN maksua - maksetun
    // tilauksen lisärivit aloittavat oman uuden tilauksensa (ks. CLAUDE.md "Paytrail").
    const existingOrder = await prisma_1.prisma.order.findFirst({
        where: {
            buyerId, sellerId: String(sellerId), status: 'PENDING_PAYMENT',
            shippingWindowEnd: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
    });
    // EI luo Paytrail-maksua tässä — ostaja käynnistää sen erikseen (POST /orders/:id/pay)
    // heti perään frontendistä, samana käyttäjätoimintona ("Maksa tämä myyjä" -nappi kutsuu
    // molemmat peräkkäin).
    let order;
    if (existingOrder) {
        order = await prisma_1.prisma.order.update({
            where: { id: existingOrder.id },
            data: {
                productTotal: existingOrder.productTotal + subtotal,
                // Uudet tuotteet voivat vaatia ison pakettikoon - nollataan aiempi valinta jos
                // sellainen ehdittiin jo tehdä, jotta ostaja valitsee sen uudestaan ennen maksua.
                shippingPrice: null, shippingSize: null,
                items: { create: items.map(i => ({ productId: i.productId, price: i.price, quantity: i.quantity })) },
            },
            include: { items: true },
        });
    }
    else {
        order = await prisma_1.prisma.order.create({
            data: {
                buyerId, sellerId: String(sellerId),
                status: 'PENDING_PAYMENT',
                productTotal: subtotal,
                paymentDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
                shippingWindowEnd: new Date(Date.now() + SHIPPING_MERGE_WINDOW_MS),
                items: { create: items.map(i => ({ productId: i.productId, price: i.price, quantity: i.quantity })) },
            },
            include: { items: true },
        });
    }
    // Varasto vähennettiin jo korilisäyksen yhteydessä — täällä vain SOLD niille joiden varasto on tyhjentynyt (status RESERVED)
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.cartItem.deleteMany({ where: { id: { in: items.map(i => i.id) } } }),
        prisma_1.prisma.product.updateMany({
            where: { id: { in: items.map(i => i.productId) }, status: 'RESERVED' },
            data: { status: 'SOLD' },
        }),
    ]);
    const remaining = await prisma_1.prisma.cartItem.count({ where: { cartId: cart.id } });
    if (remaining === 0)
        await prisma_1.prisma.cart.delete({ where: { id: cart.id } }).catch(() => { });
    res.status(201).json({ order });
});
exports.default = router;
