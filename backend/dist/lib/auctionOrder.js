"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderForAuctionWin = createOrderForAuctionWin;
const prisma_1 = require("../db/prisma");
const SHIPPING_MERGE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h yhdistämisikkuna — sama sääntö kuin cart/checkout
// Luo (tai liittää olemassaolevaan, kesken olevaan yhdistettyyn lähetykseen) Order-rivin
// voitetulle huutokaupalle/osta heti -ostokselle. Ilman tätä huutokaupan voittaja ei pääse
// koskaan maksamaan — closeAuctions ja buy-now vain merkitsivät tuotteen myydyksi ja
// lähettivät ilmoituksen "sinulla on aikaa maksaa", mutta Orderia ei koskaan syntynyt.
//
// EI luo Paytrail-maksua tässä — maksu käynnistetään erikseen ostajan omasta aloitteesta
// (POST /orders/:id/pay), koska huutokaupan voitto on PASSIIVINEN tapahtuma (voittaja ei
// välttämättä ole edes sivustolla sillä hetkellä) - maksuistunnon luonti vasta kun ostaja
// oikeasti aikoo maksaa (esim. /ostot-sivulta) on ainoa järkevä hetki.
async function createOrderForAuctionWin(buyerId, sellerId, productId, price, paymentWindowMs) {
    const now = new Date();
    // Yhdistäminen vain vielä maksamattomaan tilaukseen - tuote+toimitus maksetaan aina
    // yhdessä (ks. CLAUDE.md "Paytrail"), joten maksetun tilauksen lisärivit aloittavat
    // oman uuden tilauksensa.
    const existingOrder = await prisma_1.prisma.order.findFirst({
        where: { buyerId, sellerId, status: 'PENDING_PAYMENT', shippingWindowEnd: { gt: now } },
        orderBy: { createdAt: 'desc' },
    });
    if (existingOrder) {
        return prisma_1.prisma.order.update({
            where: { id: existingOrder.id },
            data: {
                productTotal: existingOrder.productTotal + price,
                shippingPrice: null, shippingSize: null,
                items: { create: [{ productId, price, quantity: 1 }] },
            },
        });
    }
    return prisma_1.prisma.order.create({
        data: {
            buyerId, sellerId,
            status: 'PENDING_PAYMENT',
            productTotal: price,
            paymentDeadline: new Date(now.getTime() + paymentWindowMs),
            shippingWindowEnd: new Date(now.getTime() + SHIPPING_MERGE_WINDOW_MS),
            items: { create: [{ productId, price, quantity: 1 }] },
        },
    });
}
