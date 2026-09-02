"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExpiredPayments = checkExpiredPayments;
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const prisma_1 = require("../db/prisma");
const notify_1 = require("../lib/notify");
const livekit_1 = require("../lib/livekit");
const paytrail_1 = require("../lib/paytrail");
const resend_1 = require("../lib/resend");
const router = (0, express_1.Router)();
// TIUKENNETTU 2026-08-13 (LUKITTU, ks. CLAUDE.md "Banni"): jo ENSIMMÄINEN maksamaton
// tilaus → automaattinen 30 päivän banni heti, ei enää 3 kerran varoitusrajaa. Jokainen
// seuraava rike (kun aiempi banni on jo umpeutunut) → uusi 30 päivän banni.
const VIOLATIONS_BEFORE_BAN = 1;
const BAN_DAYS = 30;
// Peruuttaa erääntyneet (maksamattomat) tilaukset, vapauttaa tuotteet,
// kirjaa PaymentViolationin ja bannaa käyttäjän 30 päiväksi heti ensimmäisestä rikkomuksesta.
async function checkExpiredPayments() {
    const expired = await prisma_1.prisma.order.findMany({
        where: { status: 'PENDING_PAYMENT', paymentDeadline: { lt: new Date() } },
        include: { items: { include: { product: true } }, buyer: true },
    });
    for (const order of expired) {
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
            // Huutokauppatuote ei palaa PENDING-tilaan (auctionEndsAt on jo mennyt — closeAuctions poimisi sen heti
            // uudelleen ja yrittäisi ilmoittaa samalle maksamattomalle voittajalle loputtomasti). Merkitään lopullisesti
            // myymättömäksi — myyjä voi listata sen uudestaan manuaalisesti jos haluaa.
            ...order.items.map(item => item.product.saleType === 'auction'
                ? prisma_1.prisma.product.update({
                    where: { id: item.productId },
                    data: { status: 'UNSOLD', finalPrice: null, currentBid: null, currentBidderId: null, auctionEndsAt: null },
                })
                : prisma_1.prisma.product.update({
                    where: { id: item.productId },
                    data: { quantity: { increment: item.quantity }, status: 'PENDING', finalPrice: null },
                })),
            prisma_1.prisma.paymentViolation.create({ data: { userId: order.buyerId, orderId: order.id } }),
        ]);
        await (0, notify_1.notifyUser)(order.buyerId, 'PAYMENT_EXPIRED', 'Maksuaika umpeutui', 'Tilauksesi maksuaika umpeutui ja tilaus peruutettiin.', '/ostot');
        const violationCount = await prisma_1.prisma.paymentViolation.count({ where: { userId: order.buyerId } });
        if (violationCount >= VIOLATIONS_BEFORE_BAN) {
            const activeBan = await prisma_1.prisma.ban.findFirst({ where: { userId: order.buyerId, endsAt: { gt: new Date() } } });
            if (!activeBan) {
                const ban = await prisma_1.prisma.ban.create({
                    data: {
                        userId: order.buyerId,
                        reason: 'Maksamaton tilaus',
                        endsAt: new Date(Date.now() + BAN_DAYS * 24 * 60 * 60 * 1000),
                    },
                });
                await (0, notify_1.notifyUser)(order.buyerId, 'BAN_ISSUED', 'Tilisi on estetty', `Tilisi on estetty ${BAN_DAYS} päiväksi maksamattoman tilauksen vuoksi.`, '/dashboard/profiili');
                await (0, resend_1.sendBanNotificationEmail)(order.buyer.email, order.buyer.name, ban.endsAt.toISOString(), 'Maksamaton tilaus');
                console.log(`[ban] Käyttäjä ${order.buyerId} bannattu ${ban.endsAt.toISOString()} asti (${violationCount} maksamatonta tilausta)`);
            }
        }
    }
    return expired.length;
}
// POST /webhooks/payment-expired — kutsutaan ulkoisesta cronista (esim. tuotannon 5min ajastin)
router.post('/payment-expired', async (_req, res) => {
    const cancelled = await checkExpiredPayments();
    res.json({ cancelled });
});
// POST /webhooks/livekit — LiveKit kutsuu Ingress-tapahtumista (2026-08-09 migraatio
// MediaMTX:n runOnAvailable/runOnUnavailable-shell-hookeista, ks. CLAUDE.md "PÄÄTÖS
// 2026-08-09"). Huoneen nimestä ("seller-{userId}") pääteltävä myyjä ja hänen aktiivinen
// lähetyksensä samalla logiikalla kuin ennen. Vaatii raa'an pyyntörungon allekirjoituksen
// varmistamiseksi (WebhookReceiver.receive), ei siis express.json()-jäsennystä tälle reitille.
router.post('/livekit', express_2.default.raw({ type: '*/*' }), async (req, res) => {
    let event;
    try {
        event = await livekit_1.webhookReceiver.receive(req.body.toString('utf8'), req.headers.authorization);
    }
    catch {
        return res.status(401).send('invalid signature');
    }
    const roomName = event.ingressInfo?.roomName ?? event.room?.name;
    const sellerId = roomName ? (0, livekit_1.sellerIdFromRoomName)(roomName) : null;
    if (event.event === 'ingress_started') {
        // EI muuta Show'n statusta SCHEDULED -> LIVE automaattisesti — OBS-yhteyden muodostuminen
        // tarkoittaa vain että myyjä näkee yksityisen esikatselun. Julkiseksi lähetys tulee vasta
        // eksplisiittisestä "Aloita julkinen lähetys" -painalluksesta (PATCH /shows/:id/status).
        // Ks. CLAUDE.md "Live-lähetyksen esikatselu ennen julkista näkyvyyttä". Ei siis tarvitse
        // tehdä mitään tässä paitsi kuitata onnistuneesti - reitti on olemassa lähinnä loggausta/
        // tulevaa käyttöä varten.
    }
    else if (event.event === 'ingress_ended' && sellerId) {
        const show = await prisma_1.prisma.show.findFirst({
            where: { sellerId, status: 'LIVE' },
            orderBy: { startedAt: 'desc' },
        });
        if (show) {
            await prisma_1.prisma.show.update({ where: { id: show.id }, data: { status: 'ENDED', endedAt: new Date() } });
            (0, notify_1.emitToShow)(show.id, 'show_status', { status: 'ENDED' });
        }
    }
    else if ((event.event === 'participant_left' || event.event === 'participant_connection_aborted') &&
        sellerId && event.participant?.identity === `${sellerId}-phone`) {
        // Puhelimesta-suoraan-julkaisun vastine ingress_ended:lle (ks. CLAUDE.md
        // "Selainpohjainen mobiilistriimaus"). Ilman tätä lähetys jäi ikuisesti LIVE-tilaan
        // kun puhelimen selainvälilehti suljettiin/verkko katkesi, koska mikään ei koskaan
        // merkinnyt sitä päättyneeksi - näkyi katsojille "zombie"-livenä joka ei koskaan
        // toimi. Sama identity-tunniste kuin createPublisherToken():ssa (lib/livekit.ts).
        const show = await prisma_1.prisma.show.findFirst({
            where: { sellerId, status: 'LIVE' },
            orderBy: { startedAt: 'desc' },
        });
        if (show) {
            await prisma_1.prisma.show.update({ where: { id: show.id }, data: { status: 'ENDED', endedAt: new Date() } });
            (0, notify_1.emitToShow)(show.id, 'show_status', { status: 'ENDED' });
        }
    }
    res.status(200).send('ok');
});
// GET /webhooks/paytrail — Paytrailin server-to-server callback (HUOM: GET, ei POST —
// Paytrail kutsuu redirect- ja callback-URL:eja samalla tavalla, query-parametrein, ks.
// docs "Redirect and callback URL parameters"). Sama osoite annettu sekä success- että
// cancel-callbackUrl:na createPaymentissa, checkout-status kertoo kumpi tapahtui.
//
// EI KOSKAAN luoteta ilmoitukseen ennen HMAC-allekirjoituksen varmistusta - kuka tahansa
// voisi muuten kutsua tätä URL:ia suoraan ja väittää maksun onnistuneen ilman että
// mitään oikeasti maksettiin.
router.get('/paytrail', async (req, res) => {
    const query = {};
    for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string')
            query[key] = value;
    }
    if (!(0, paytrail_1.verifyCallbackSignature)(query)) {
        console.error('[paytrail webhook] virheellinen allekirjoitus, hylätty', query);
        return res.status(401).send('invalid signature');
    }
    const stamp = query['checkout-stamp'];
    const status = query['checkout-status'];
    const parsed = stamp ? (0, paytrail_1.parseStamp)(stamp) : null;
    if (!parsed)
        return res.status(200).send('ok'); // tuntematon stamp - ei voida käsitellä, mutta kuitataan ettei Paytrail yritä uudelleen loputtomiin
    const order = await prisma_1.prisma.order.findUnique({ where: { id: parsed.orderId } });
    if (!order)
        return res.status(200).send('ok');
    // Idempotenssi: Paytrail voi kutsua tätä useita kertoja samasta tapahtumasta (dokumentoitu
    // käytös) - tarkista ettei tilausta ole jo viety eteenpäin ennen kuin päivitetään/ilmoitetaan.
    // Yksi tilaus = yksi maksu (tuote+toimitus yhdessä), joten yksi onnistunut webhook riittää.
    if (status === 'ok' && order.status === 'PENDING_PAYMENT') {
        const total = order.productTotal + (order.shippingPrice ?? 0);
        await prisma_1.prisma.order.update({ where: { id: order.id }, data: { status: 'PENDING_SHIPPING', paymentDeadline: null } });
        await (0, notify_1.notifyUser)(order.sellerId, 'ORDER_PAID', 'Ostaja maksoi tilauksen', `Tilaus ${total.toLocaleString('fi-FI')}€ on maksettu ja valmiina lähetettäväksi.`, '/dashboard/tilaukset');
    }
    // status 'fail'/'pending'/'delayed', tai jo käsitelty tila: ei toimenpiteitä - ostaja
    // voi yrittää maksaa uudelleen /ostot-sivulta, tai payment-expired-cron siivoaa myöhemmin.
    res.status(200).send('ok');
});
exports.default = router;
