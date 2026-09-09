"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExpiredPayments = checkExpiredPayments;
exports.handleStripeWebhook = handleStripeWebhook;
exports.handleStripeAccountWebhook = handleStripeAccountWebhook;
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const prisma_1 = require("../db/prisma");
const notify_1 = require("../lib/notify");
const livekit_1 = require("../lib/livekit");
const stripe_1 = require("../lib/stripe");
const resend_1 = require("../lib/resend");
const orderCancellation_1 = require("../lib/orderCancellation");
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
        // Umpeutuminen ON rike (ostaja jätti reagoimatta) - PaymentViolation kirjataan aina, toisin
        // kuin ostajan omassa vapaaehtoisessa peruutuksessa (ks. orders.ts POST /:id/cancel, joka
        // käyttää samaa buildStockRestoreOps-apufunktiota mutta EI koskaan tätä riviä).
        await prisma_1.prisma.$transaction([
            ...(0, orderCancellation_1.buildStockRestoreOps)(order),
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
// POST /webhooks/stripe — Stripen server-to-server ilmoitus maksutapahtumista. HUOM: tämä
// reitti EI kulje tämän routerin (webhooksRouter) kautta normaalisti — se on montattu
// suoraan index.ts:ään ENNEN globaalia express.json()-middlewarea, koska Stripen
// allekirjoituksen varmistus (constructEvent) vaatii RAA'AN, jäsentämättömän pyyntörungon
// (Buffer). Jos express.json() ehtisi jäsentää bodyn ensin, allekirjoitus ei koskaan
// täsmäisi. Tämä funktio on silti tässä tiedostossa loogisen sijoittelun vuoksi (sama
// paikka kuin muutkin maksu-/tilaustapahtumia käsittelevät webhookit).
//
// EI KOSKAAN luoteta ilmoitukseen ennen allekirjoituksen varmistusta - kuka tahansa voisi
// muuten kutsua tätä URL:ia suoraan ja väittää maksun onnistuneen ilman että mitään
// oikeasti maksettiin.
async function handleStripeWebhook(req, res) {
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string')
        return res.status(400).send('missing signature');
    let event;
    try {
        event = (0, stripe_1.verifyWebhookSignature)(req.body, signature);
    }
    catch (err) {
        console.error('[stripe webhook] virheellinen allekirjoitus, hylätty', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (!orderId)
            return res.status(200).send('ok'); // tuntematon metadata - ei voida käsitellä, mutta kuitataan ettei Stripe yritä uudelleen loputtomiin
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: { select: { email: true, name: true } },
                items: { include: { product: { select: { name: true } } } },
            },
        });
        if (!order)
            return res.status(200).send('ok');
        // Idempotenssi: Stripe voi kutsua tätä useita kertoja samasta tapahtumasta (dokumentoitu
        // käytös) - tarkista ettei tilausta ole jo viety eteenpäin ennen kuin päivitetään/
        // ilmoitetaan. Yksi tilaus = yksi maksu (tuote+toimitus yhdessä), joten yksi onnistunut
        // webhook riittää. Sama ehto suojaa myös tilausvahvistussähköpostia (ks. CLAUDE.md,
        // sähköpostit-integraatio 2026-09-03) - toistokutsu näkee order.status:in jo
        // PENDING_SHIPPING:nä eikä lähetä uudestaan.
        if (order.status === 'PENDING_PAYMENT') {
            const total = order.productTotal + (order.shippingPrice ?? 0);
            await prisma_1.prisma.order.update({
                where: { id: order.id },
                data: { status: 'PENDING_SHIPPING', paymentDeadline: null, stripePaymentIntentId: session.payment_intent ?? null },
            });
            await (0, notify_1.notifyUser)(order.sellerId, 'ORDER_PAID', 'Ostaja maksoi tilauksen', `Tilaus ${total.toLocaleString('fi-FI')}€ on maksettu ja valmiina lähetettäväksi.`, '/dashboard/tilaukset');
            const productNames = order.items.map(i => i.product.name).join(', ');
            void (0, resend_1.sendOrderConfirmationEmail)(order.buyer.email, order.buyer.name, order.id, productNames, total);
        }
    }
    // Muut tapahtumatyypit (esim. checkout.session.async_payment_failed) - ei toimenpiteitä
    // toistaiseksi, ostaja voi yrittää maksaa uudelleen /ostot-sivulta, tai payment-expired-
    // cron siivoaa myöhemmin.
    res.status(200).json({ received: true });
}
// POST /webhooks/stripe-accounts — Stripen v2 "thin event" -ilmoitukset myyjien Connect-
// tilien kapasiteettimuutoksista (ks. CLAUDE.md "PÄÄTÖS 2026-09-09: SIGNICAT/CRIIPTO
// HYLÄTTY"). ERI reitti/ERI signing secret kuin yllä oleva /webhooks/stripe (v1
// checkout-tapahtumat) - v2-tilitapahtumat rekisteröidään omana Event Destinationina,
// ei Dashboardin klassisena webhook-URL:na (ks. lib/stripe.ts:n kommentti,
// scripts/registerStripeAccountEventDestination.ts). Sama raaka-runko-vaatimus kuin
// /webhooks/stripe:llä, montattu index.ts:ssä ennen express.json():ia.
//
// Automatisoi sen mitä omistaja teki aiemmin käsin admin-paneelista: kun myyjän Stripe-
// onboarding valmistuu (stripe_transfers-kapasiteetti menee active-tilaan), User.verified
// asetetaan todeksi ilman että kenenkään tarvitsee klikata mitään. EI KOSKAAN luoteta
// thin eventin omaan runkoon kapasiteetin UUDESTA arvosta (sitä ei edes sisälly siihen,
// vain tilin ID) - haetaan aina tuore tila suoraan Stripeltä ennen kirjoitusta.
async function handleStripeAccountWebhook(req, res) {
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string')
        return res.status(400).send('missing signature');
    let event;
    try {
        event = (0, stripe_1.verifyAccountEventSignature)(req.body, signature);
    }
    catch (err) {
        console.error('[stripe account webhook] virheellinen allekirjoitus, hylätty', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'v2.core.account[configuration.recipient].capability_status_updated' && event.related_object?.id) {
        const accountId = event.related_object.id;
        try {
            const { transfersEnabled } = await (0, stripe_1.getAccountStatus)(accountId);
            if (transfersEnabled) {
                // updateMany + verified:false-ehto: idempotentti, ei kirjoita mitään jos käyttäjä on
                // jo vahvistettu (esim. admin ehti jo klikata kytkintä, tai Stripe lähettää saman
                // tapahtuman uudestaan - dokumentoitu käytös).
                const updated = await prisma_1.prisma.user.updateMany({
                    where: { stripeAccountId: accountId, verified: false },
                    data: { verified: true },
                });
                if (updated.count > 0) {
                    console.log(`[stripe account webhook] User.verified=true asetettu automaattisesti tilille ${accountId}`);
                }
            }
        }
        catch (err) {
            console.error('[stripe account webhook] tilan haku epäonnistui', accountId, err.message);
        }
    }
    res.status(200).json({ received: true });
}
exports.default = router;
