"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExpiredOffers = checkExpiredOffers;
const prisma_1 = require("../db/prisma");
const notify_1 = require("../lib/notify");
const OFFER_EXPIRY_MS = 48 * 60 * 60 * 1000; // sama 48h-ikkuna kuin myyjän lähetysaika, looginen yhdenmukaisuus (ks. CLAUDE.md "Tarjoa hintaa")
// Vanhenee jos myyjä (pending) tai ostaja (countered) ei reagoi 48h sisällä - ei jää roikkumaan ikuisesti.
async function checkExpiredOffers() {
    const cutoff = new Date(Date.now() - OFFER_EXPIRY_MS);
    const expiring = await prisma_1.prisma.offer.findMany({
        where: { status: { in: ['pending', 'countered'] }, createdAt: { lt: cutoff } },
        include: { product: { select: { name: true, sellerId: true } } },
    });
    for (const offer of expiring) {
        await prisma_1.prisma.offer.update({ where: { id: offer.id }, data: { status: 'expired', respondedAt: new Date() } });
        await (0, notify_1.notifyUser)(offer.buyerId, 'OFFER_DECLINED', 'Tarjous vanhentui', `Tarjouksesi tuotteesta ${offer.product.name} vanhentui ilman vastausta.`, `/tuotteet/${offer.productId}`);
    }
    return expiring.length;
}
