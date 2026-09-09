"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const shipping_1 = require("../lib/shipping");
const stripe_1 = require("../lib/stripe");
const postiService = __importStar(require("../lib/postiService"));
const postiClient = __importStar(require("../lib/postiClient"));
const notify_1 = require("../lib/notify");
const resend_1 = require("../lib/resend");
const orderCancellation_1 = require("../lib/orderCancellation");
const router = (0, express_1.Router)();
// Nouto-tilauksen vahvistuskoodi — 6 numeroa, helppo lukea/sanoa ääneen fyysisessä noudossa
function generatePickupCode() {
    return String(crypto_1.default.randomInt(100000, 1000000));
}
// Laskee postitus-tilauksen Posti-seurantatilan tuoreena (MOCK, ks. lib/postiService.ts) aina
// kun tilauslista haetaan — ei vaadi erillistä pollausreittiä, sama periaate kuin oikea
// integraatio joskus tekisi taustalla. Kirjoittaa kannan päivitetyn tilan vain jos se muuttui.
async function withLiveTrackingStatus(order) {
    if (!order.trackingNumber || !order.shippedAt)
        return order;
    const { status } = postiService.getTrackingStatus(order.trackingNumber, order.shippedAt);
    if (status !== order.postiStatus) {
        await prisma_1.prisma.order.update({ where: { id: order.id }, data: { postiStatus: status } }).catch(() => { });
    }
    return { ...order, postiStatus: status };
}
const orderInclude = {
    items: { include: { product: { select: { id: true, name: true, imageUrl: true, condition: true, allowPickup: true, allowShipping: true } } } },
    buyer: { select: { id: true, name: true, username: true, address: true, postalCode: true, city: true, phone: true } },
    seller: { select: { id: true, name: true, username: true } },
    reviews: { select: { reviewerId: true } },
};
// GET /orders/mine — omat ostot
router.get('/mine', auth_1.authMiddleware, async (req, res) => {
    const orders = await prisma_1.prisma.order.findMany({
        where: { buyerId: req.userId },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
    });
    res.json(await Promise.all(orders.map(withLiveTrackingStatus)));
});
// GET /orders/selling — myyntitilaukset
router.get('/selling', auth_1.authMiddleware, async (req, res) => {
    const orders = await prisma_1.prisma.order.findMany({
        where: { sellerId: req.userId },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
    });
    // pickupCode ei näy myyjälle etukäteen — ostaja kertoo/näyttää sen fyysisessä noudossa,
    // myyjä syöttää sen /confirm-pickup:iin vasta silloin
    const stripped = orders.map(({ pickupCode, ...rest }) => rest);
    res.json(await Promise.all(stripped.map(withLiveTrackingStatus)));
});
// POST /orders/:id/select-shipping — ostaja valitsee toimitustavan ENNEN maksua (ei enää
// oma erillinen maksuvaiheensa, ks. CLAUDE.md "Paytrail -> Stripe" — omistajan korjaus
// 2026-08-12: tuote ja toimitus maksetaan aina yhdessä, ei kahdessa erillisessä maksussa).
router.post('/:id/select-shipping', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: String(req.params.id) } });
    if (!order || order.buyerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.status !== 'PENDING_PAYMENT')
        return res.status(400).json({ error: 'Tilaus on jo maksettu tai ei odota maksua' });
    if (!order.shippingWindowEnd || order.shippingWindowEnd < new Date()) {
        return res.status(400).json({ error: 'Yhdistetyn lähetyksen 6h ikkuna on umpeutunut' });
    }
    const { pakettikokoId, pickupPointId } = req.body;
    const price = (0, shipping_1.getShippingPrice)(String(pakettikokoId ?? ''));
    if (price === null)
        return res.status(400).json({ error: 'Virheellinen pakettikoko' });
    const isNouto = pakettikokoId === 'nouto';
    const isPostitus = pakettikokoId === 'postitus';
    const updated = await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: {
            shippingSize: pakettikokoId,
            shippingPrice: price,
            // pickupPointId = ostajan valitsema Postin noutopiste (MOCK, ks. lib/postiService.ts) —
            // eri asia kuin pickupCode, joka koskee "Nouto myyjältä" -toimitustapaa
            pickupPointId: isPostitus ? (pickupPointId ? String(pickupPointId) : null) : null,
            ...(isNouto ? { pickupCode: generatePickupCode() } : {}),
        },
    });
    res.json({ order: updated });
});
// POST /orders/:id/pay — käynnistää YHDEN Stripe Checkout Sessionin koko tilaukselle
// (tuote + toimitus yhdessä — vaatii että toimitustapa on jo valittu, ks. select-shipping
// yllä). Korvaa Paytrailin (ks. CLAUDE.md "Paytrail -> Stripe" 2026-09-09).
router.post('/:id/pay', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: String(req.params.id) },
        include: {
            items: { include: { product: { select: { name: true } } } },
            buyer: { select: { email: true } },
            // Myyjän mahdolliset admin-asettamat komissiopoikkeukset (ks. CLAUDE.md/INTEGRATION.md
            // 2026-09-02) haetaan TÄSTÄ - ei koskaan luoteta frontendiltä tulevaan arvoon. createdAt
            // tarvitaan 14 päivän 0%-tutustumisjakson laskentaan (ks. getEffectiveCommissionOverride).
            // stripeAccountId tarvitaan destination-chargen kohteeksi - ilman sitä ei ole minne
            // ohjata myyjän osuutta.
            seller: { select: { customCommissionRate: true, customCommissionCap: true, createdAt: true, stripeAccountId: true } },
        },
    });
    if (!order || order.buyerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.status !== 'PENDING_PAYMENT')
        return res.status(400).json({ error: 'Ei odottavaa maksua' });
    if (order.shippingPrice == null)
        return res.status(400).json({ error: 'Valitse ensin toimitustapa' });
    if (!order.seller.stripeAccountId)
        return res.status(400).json({ error: 'Myyjä ei ole vielä yhdistänyt Stripe-tiliään maksujen vastaanottamiseen' });
    // Tarkistetaan ETUKÄTEEN onko destination-chargen kohdetili valmis vastaanottamaan siirtoja
    // - löydetty tuotantotestissä 2026-09-09: ilman tätä Stripe hylkää Checkout Sessionin
    // luonnin raa'alla englanninkielisellä virheellä ("destination account needs to have...
    // stripe_transfers capability") jos myyjän onboarding on kesken. Selkeämpi suomenkielinen
    // virhe tässä on parempi UX ostajalle kuin Stripen oma tekninen virheviesti.
    // ⚠️ Oma try/catch TÄRKEÄ tässä (löytyi vasta tuotanto-avainten vaihdon yhteydessä 2026-09-09):
    // getAccountStatus() ei ollut aiemmin minkään catch-lohkon sisällä - jos stripeAccountId on
    // testitilassa luotu (esim. sk_test_-avaimella tehty onboarding), sk_live_-avain ei löydä sitä
    // ollenkaan ("No such account") ja Stripe-kirjasto heittää poikkeuksen. Ilman tätä catchia koko
    // pyyntö olisi kaatunut käsittelemättömään 500-virheeseen jokaiselle myyjälle jonka Stripe-tili
    // on jäänyt vanhaan tilaan kesken testi->tuotanto-siirtymän.
    let transfersEnabled = false;
    try {
        const status = await (0, stripe_1.getAccountStatus)(order.seller.stripeAccountId);
        transfersEnabled = status.transfersEnabled;
    }
    catch (e) {
        console.error('[stripe] getAccountStatus epäonnistui, tili todennäköisesti vanhentunut/väärässä tilassa:', order.seller.stripeAccountId, e.message);
    }
    if (!transfersEnabled)
        return res.status(400).json({ error: 'Myyjän Stripe-onboarding on vielä kesken, tilausta ei voi maksaa juuri nyt' });
    // HUOM status 400, ei 502/500 - Cloudflare korvaa 502/503/504-vastausten rungon omalla
    // geneerisellä virhesivullaan (ohittaa alkuperäisen JSON-bodyn kokonaan), havaittu
    // testauksessa refund-reitillä. 400 kulkee läpi sellaisenaan.
    try {
        const { rate: effectiveRate, cap: effectiveCap } = (0, stripe_1.getEffectiveCommissionOverride)(order.seller);
        // Komissio lasketaan VAIN tuoteriveistä (ei toimituksesta, LUKITTU-sääntö) - yhtenä
        // application_fee_amount:ina koko tilaukselle, koska Order.sellerId on aina yksittäinen
        // (ei tarvitse per-rivi-komissiota kuten Paytrailin Shop-in-Shopissa).
        const commissionCents = order.items.reduce((sum, i) => sum + (0, stripe_1.computeCommissionCents)(i.price * i.quantity, effectiveRate, effectiveCap), 0);
        const items = order.items.map(i => ({ name: i.product.name, unitPriceEuros: i.price, quantity: i.quantity }));
        const session = await (0, stripe_1.createCheckoutSession)({
            orderId: order.id, items, shippingEuros: order.shippingPrice, buyerEmail: order.buyer.email,
            sellerStripeAccountId: order.seller.stripeAccountId, commissionCents,
        });
        await prisma_1.prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.sessionId } });
        return res.json({ order, redirectUrl: session.redirectUrl });
    }
    catch (e) {
        return res.status(400).json({ error: e.message ?? 'Maksun aloitus epäonnistui' });
    }
});
// POST /orders/:id/cancel — ostaja peruuttaa OMAN, vielä maksamattoman tilauksensa
// vapaaehtoisesti (ks. CLAUDE.md "Ostoskori/tilauksen peruutus" 2026-09-09). Ennen tätä
// ainoat vaihtoehdot maksamattomalle tilaukselle olivat maksaa tai antaa 2h umpeutua — jälkimmäinen
// laukaisee LUKITTU-säännön mukaisen 30 päivän bannin heti ensimmäisestä kerrasta (ks.
// "Banni"-sääntö), mikä oli kohtuutonta jos ostaja vain haluaa perua mielensä muutettuaan
// esim. vahingossa aloitetun maksun. Käyttää samaa varastonpalautuslogiikkaa kuin
// checkExpiredPayments() (ks. lib/orderCancellation.ts), mutta EI KOSKAAN kirjaa
// PaymentViolationia eikä bannaa — vapaaehtoinen, rehellinen peruutus ei ole rike.
//
// ⚠️ EI SAA RISTIRIITAA LUKITTU-säännön "Kaikki huudot sitovia — ei peruutuksia" kanssa
// (omistajan muistutus 2026-09-09). Jos YKSIKIN tilauksen riveistä on syntynyt voitetusta
// huudosta/hyväksytystä tarjouksesta (OrderItem.binding, ks. schema.prisma-kommentti —
// asetetaan lib/auctionOrder.ts:n createOrderForAuctionWin():ssa: perinteisen huutokaupan
// voitto, "osta heti" auktiotuotteelle, hyväksytty tarjous, TAI live-huudon voitto), koko
// tilausta EI voi peruuttaa — myös silloin kun sama Order sisältää lisäksi 6h-yhdistämis-
// ikkunan kautta liittyneen tavallisen kori-ostoksen. Vain puhtaasti ei-sitovista riveistä
// (cart.ts checkout - suoramyynti/live-shop-osto ilman huutoa) koostuva tilaus on peruttavissa.
router.post('/:id/cancel', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: String(req.params.id) },
        include: { items: { include: { product: { select: { name: true, saleType: true } } } } },
    });
    if (!order || order.buyerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.status !== 'PENDING_PAYMENT')
        return res.status(400).json({ error: 'Tilausta ei voi enää peruuttaa' });
    if (order.items.some(i => i.binding)) {
        return res.status(400).json({ error: 'Tilaus sisältää voitetun huudon tai hyväksytyn tarjouksen — sitovaa ostosta ei voi peruuttaa' });
    }
    await prisma_1.prisma.$transaction((0, orderCancellation_1.buildStockRestoreOps)(order));
    const productNames = order.items.map(i => i.product.name).join(', ');
    await (0, notify_1.notifyUser)(order.sellerId, 'ORDER_CANCELLED_BY_BUYER', 'Ostaja peruutti tilauksen', `Ostaja peruutti maksamattoman tilauksen (${productNames}) ennen maksua — tuote on taas myynnissä.`, '/dashboard/tuotteet');
    res.json({ ok: true });
});
// POST /orders/:id/refund — myyjä hyvittää maksetun tilauksen, kokonaan tai per-tuote.
// Stripe purkaa destination-chargen jaon automaattisesti (reverse_transfer+
// refund_application_fee, ks. lib/stripe.ts) - komissio-osuus palautuu suhteutettuna
// hyvitettyyn summaan ilman että meidän tarvitsee laskea sitä itse (eri kuin Paytrail).
// Body: { itemIds?: string[] } — jätä pois tai anna tyhjä taulukko koko tuotemaksun
// hyvittämiseksi, tai anna tietyt OrderItem-ID:t hyvittääksesi vain ne.
router.post('/:id/refund', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: String(req.params.id) },
        include: { items: true },
    });
    if (!order || order.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (!order.stripePaymentIntentId)
        return res.status(400).json({ error: 'Tilaukselle ei ole maksettua tuotemaksua hyvitettäväksi' });
    if (!['PENDING_SHIPPING', 'SHIPPED', 'DELIVERED', 'DISPUTED'].includes(order.status)) {
        return res.status(400).json({ error: 'Tilaus ei ole maksetussa tilassa' });
    }
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : [];
    try {
        if (itemIds.length === 0) {
            // Koko maksu (tuote+toimitus, ne maksettiin yhdessä - ks. CLAUDE.md "Paytrail -> Stripe")
            await (0, stripe_1.refundPayment)(order.stripePaymentIntentId);
        }
        else {
            const items = order.items.filter(i => itemIds.includes(i.id));
            if (items.length === 0)
                return res.status(400).json({ error: 'Tuntemattomat tuoterivit' });
            const amountEuros = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
            await (0, stripe_1.refundPayment)(order.stripePaymentIntentId, amountEuros);
        }
    }
    catch (e) {
        return res.status(400).json({ error: e.message ?? 'Hyvitys epäonnistui Stripeltä' });
    }
    await (0, notify_1.notifyUser)(order.buyerId, 'REFUND_ISSUED', 'Sait hyvityksen', `Myyjä hyvitti tilauksen ${order.id} — hyvitys näkyy maksutavallasi muutaman päivän sisällä.`, '/ostot');
    res.json({ ok: true });
});
// POST /orders/:id/tracking — myyjä lisää seurantakoodin
router.post('/:id/tracking', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: String(req.params.id) },
        include: { buyer: { select: { email: true, name: true } }, items: { include: { product: { select: { name: true } } } } },
    });
    if (!order || order.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.status !== 'PENDING_SHIPPING')
        return res.status(400).json({ error: 'Tilaus ei odota lähetystä' });
    const { trackingCode } = req.body;
    if (!trackingCode)
        return res.status(400).json({ error: 'Seurantakoodi vaaditaan' });
    // Ei vaadi erillistä maksun vapautus-/capture-kutsua — Stripen destination charge (ks.
    // lib/stripe.ts createCheckoutSession) siirsi myyjän osuuden hänen tililleen jo
    // maksuhetkellä, tämä vain päivittää tilauksen tilan.
    const updated = await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: { trackingCode, status: 'SHIPPED', shippedAt: new Date() },
    });
    await (0, notify_1.notifyUser)(order.buyerId, 'ORDER_SHIPPED', 'Tilauksesi lähetettiin', `Seurantakoodi: ${trackingCode}`, '/ostot');
    // Idempotentti yllä olevan status-vahdin ansiosta - reitti hyväksyy vain PENDING_SHIPPING:in,
    // joten toistokutsu jo SHIPPED-tilaan olevalle tilaukselle palauttaa 400:n eikä pääse tänne asti.
    void (0, resend_1.sendShippingNotificationEmail)(order.buyer.email, order.buyer.name, order.items.map(i => i.product.name).join(', '), trackingCode);
    res.json(updated);
});
// POST /orders/:id/create-shipment — myyjä luo Posti-lähetyksen postitus-tilaukselle. OIKEA
// OmaPosti Pro API v2 -kutsu 2026-09-04 alkaen (ks. CLAUDE.md "Lähetysintegraatio") - ei enää
// postiService-mock. POSTI_TEST_MODE=true (oletus) pitää tämän demo-ympäristössä, ei tuotannossa.
// Myyjä valitsee pakettikoon (PIENI/ISO) vasta tässä vaiheessa - ei vaikuta ostajalta jo
// veloitettuun kiinteään 6,90€:oon, puhtaasti tekninen tieto Postin parcels[].packageCode-
// kenttää varten. Korvaa manuaalisen seurantakoodin syötön automaattisesti luodulla
// trackingNumber + PDF-osoitetarralla (ks. GET /:id/label-pdf alempana - Postin oma vastauksen
// href vaatii Bearer+x-gateway-secret joita selain ei voi lähettää, siksi oma proxy-reitti).
router.post('/:id/create-shipment', auth_1.authMiddleware, async (req, res) => {
    const pakettikoko = req.body?.pakettikoko === 'ISO' ? 'ISO' : req.body?.pakettikoko === 'PIENI' ? 'PIENI' : null;
    if (!pakettikoko)
        return res.status(400).json({ error: 'Pakettikoko (PIENI/ISO) vaaditaan' });
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: String(req.params.id) },
        include: {
            seller: { select: { name: true, address: true, postalCode: true, city: true, phone: true, email: true } },
            buyer: { select: { name: true, address: true, postalCode: true, city: true, phone: true, email: true } },
        },
    });
    if (!order || order.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.shippingSize !== 'postitus')
        return res.status(400).json({ error: 'Tilaus ei ole postitus-toimitustavalla' });
    if (order.status !== 'PENDING_SHIPPING')
        return res.status(400).json({ error: 'Tilaus ei odota lähetystä' });
    let result;
    try {
        result = await postiClient.createShippingOrder({
            sender: { name: order.seller.name, address1: order.seller.address ?? '', zipcode: order.seller.postalCode ?? '', city: order.seller.city ?? '', phone: order.seller.phone ?? undefined, email: order.seller.email },
            receiver: { name: order.buyer.name, address1: order.buyer.address ?? '', zipcode: order.buyer.postalCode ?? '', city: order.buyer.city ?? '', phone: order.buyer.phone ?? undefined, email: order.buyer.email },
            serviceId: postiClient.SERVICE_ID_BY_PAKETTIKOKO[pakettikoko],
            packageCode: postiClient.PACKAGE_CODE_BY_PAKETTIKOKO[pakettikoko],
            weightKg: postiClient.WEIGHT_KG_BY_PAKETTIKOKO[pakettikoko],
            contents: 'Verkkokaupan tuote',
            pickupPointQuickId: order.pickupPointId,
        });
    }
    catch (e) {
        const message = e.message ?? 'Posti-lähetyksen luonti epäonnistui';
        // E41 "Inactive pickup point" (ks. postiClient.ts, CLAUDE.md "Posti-lähetyksen E41-virhe")
        // — ostajan valitsema noutopiste ei ole enää Postin käytössä. Alun perin virheviesti VAIN
        // selkeytettiin myyjälle ("pyydä ostajaa valitsemaan toinen") ilman että ostajalla oli
        // mitään keinoa tehdä niin - ei ilmoitusta, ei UI:ta. Korjattu 2026-09-09: ostaja saa nyt
        // ilmoituksen jossa on suora linkki /ostot-sivulle, jossa voi vaihtaa noutopisteen (ks.
        // PATCH /orders/:id/pickup-point alempana) ilman että myyjän tarvitsee erikseen kertoa asiasta.
        if (message.includes('ei ole enää Postin käytössä')) {
            await (0, notify_1.notifyUser)(order.buyerId, 'PICKUP_POINT_INACTIVE', 'Noutopiste ei ole enää käytössä', 'Valitsemasi Postin noutopiste ei ole enää käytössä. Valitse tilaukseesi toinen noutopiste, jotta myyjä voi luoda lähetyksen.', '/ostot');
        }
        return res.status(400).json({ error: message });
    }
    // Sending Code API kytketty 2026-09-04 (uudet API-roolit lisätty tiliin, ks. CLAUDE.md) -
    // ajetaan HETI lähetyksen luonnin jälkeen samalla trackingNumberilla. Alkuperäinen labelless-
    // tavoite tarkoittaa että KOODI on ensisijainen tulos, PDF vain varapolku jos koodin haku
    // epäonnistuu (esim. EDI-data ei ole vielä ehtinyt syntyä Postin puolella) - ei koskaan
    // molempia yhtä aikaa, sama periaate kuin schema.prisman kommentti jo kuvasi. Ei kaadu koko
    // reittiä jos koodin haku epäonnistuu - lähetys on jo oikeasti luotu, PDF toimii fallbackina.
    let sendingCode = null;
    try {
        sendingCode = await postiClient.getSendingCode(result.trackingNumber, { testEnvironment: postiClient.POSTI_TEST_MODE });
    }
    catch (e) {
        console.error('[posti] Sending Code -haku epäonnistui, käytetään PDF-tarraa fallbackina:', e.message);
    }
    const updated = await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: {
            trackingNumber: result.trackingNumber, postiShipmentId: result.shipmentId, pakettikoko,
            sendingCode,
            labelUrl: sendingCode ? null : (result.labelPdfHref ? `/orders/${order.id}/label-pdf` : null),
            postiLabelHref: sendingCode ? null : result.labelPdfHref,
            postiStatus: 'RECEIVED', status: 'SHIPPED', shippedAt: new Date(),
        },
    });
    const shippedMessage = sendingCode ? `Lähetyskoodi: ${sendingCode}` : 'Osoitetarra on valmis tulostettavaksi';
    await (0, notify_1.notifyUser)(order.buyerId, 'ORDER_SHIPPED', 'Tilauksesi lähetettiin', shippedMessage, '/ostot');
    res.json(updated);
});
// PATCH /orders/:id/pickup-point — ostaja vaihtaa noutopisteensä jos alkuperäinen osoittautuu
// Postilla käytöstä poistetuksi (E41-virhe, ks. CLAUDE.md "Posti-lähetyksen E41-virhe" ja
// postiClient.ts:n virheviesti) — ilman tätä myyjä oli aiemmin täysin jumissa, ei mitään keinoa
// edetä. Sallittu vain ennen lähetyksen luontia (trackingNumber tyhjä) - lähetyksen luonnin
// jälkeen vaihto ei enää tekisi mitään, Posti-lähetys on jo olemassa vanhalla pisteellä.
router.patch('/:id/pickup-point', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: String(req.params.id) } });
    if (!order || order.buyerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.shippingSize !== 'postitus')
        return res.status(400).json({ error: 'Tilaus ei ole postitus-toimitustavalla' });
    if (order.status !== 'PENDING_SHIPPING')
        return res.status(400).json({ error: 'Tilaus ei odota lähetystä' });
    if (order.trackingNumber)
        return res.status(400).json({ error: 'Lähetys on jo luotu, noutopistettä ei voi enää vaihtaa' });
    const { pickupPointId } = req.body;
    if (!pickupPointId)
        return res.status(400).json({ error: 'Noutopiste vaaditaan' });
    const updated = await prisma_1.prisma.order.update({ where: { id: order.id }, data: { pickupPointId: String(pickupPointId) } });
    await (0, notify_1.notifyUser)(order.sellerId, 'PICKUP_POINT_CHANGED', 'Ostaja vaihtoi noutopisteen', 'Ostaja valitsi uuden noutopisteen — voit nyt luoda lähetyksen uudelleen.', '/dashboard/tilaukset');
    res.json(updated);
});
// GET /orders/:id/label-pdf — striimaa Postin osoitetarran PDF-tavuina. Ei voi olla suora
// <a href> Postin omaan URLiin (order.postiLabelHref), koska se vaatii Bearer+x-gateway-secret
// -headerit joita selain ei voi lähettää plain-linkin klikkauksella - tämä reitti hakee PDF:n
// palvelinpuolella (postiClient.fetchLabelPdf()) ja striimaa sen ostajan/myyjän oman JWT:n
// suojaamana. Frontend hakee tämän fetch+blob-kautta, ei <a href>:na, ks. lib/api.ts.
router.get('/:id/label-pdf', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: String(req.params.id) } });
    if (!order || (order.sellerId !== req.userId && order.buyerId !== req.userId))
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (!order.postiLabelHref)
        return res.status(404).json({ error: 'Osoitetarraa ei ole vielä luotu' });
    try {
        const pdfBuffer = await postiClient.fetchLabelPdf(order.postiLabelHref);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);
    }
    catch (e) {
        res.status(400).json({ error: e.message ?? 'Osoitetarran haku epäonnistui' });
    }
});
// POST /orders/:id/confirm-pickup — myyjä vahvistaa noutokoodin fyysisessä noudossa, vapauttaa maksun heti
router.post('/:id/confirm-pickup', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: String(req.params.id) } });
    if (!order || order.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.shippingSize !== 'nouto')
        return res.status(400).json({ error: 'Tilaus ei ole nouto-toimitustavalla' });
    if (order.status !== 'PENDING_SHIPPING')
        return res.status(400).json({ error: 'Tilaus ei odota noutoa' });
    const code = String(req.body?.code ?? '').trim();
    if (!code)
        return res.status(400).json({ error: 'Noutokoodi vaaditaan' });
    if (code !== order.pickupCode)
        return res.status(400).json({ error: 'Väärä noutokoodi' });
    // Sama vapautuslogiikka kuin "Postin API sanoo toimitettu" -tapauksessa, mutta heti — molemmat osapuolet
    // ovat fyysisesti läsnä ja voivat vahvistaa vaihdon saman tien, ei tarvitse odottaa 14 päivää
    // Ei vaadi erillistä maksun vapautus-/capture-kutsua — Stripen destination charge (ks.
    // lib/stripe.ts createCheckoutSession) siirsi myyjän osuuden hänen tililleen jo
    // maksuhetkellä, tämä vain päivittää tilauksen tilan.
    const updated = await prisma_1.prisma.order.update({ where: { id: order.id }, data: { status: 'DELIVERED' } });
    await (0, notify_1.notifyUser)(order.sellerId, 'PAYMENT_RELEASED', 'Maksu vapautettu', 'Noutokoodi vahvistettu — maksu on vapautettu sinulle.', '/dashboard/tilaukset');
    await (0, notify_1.notifyUser)(order.buyerId, 'ORDER_DELIVERED', 'Nouto vahvistettu', 'Myyjä vahvisti noudon — kauppa on suoritettu.', '/ostot');
    res.json(updated);
});
// POST /orders/:id/confirm-delivery — ostaja kuittaa tuotteen vastaanotetuksi. TÄSMENNETTY
// 2026-09-04 (ks. CLAUDE.md "Toimituksen aikataulu ja maksuturva", "Iso testauskierros"
// kohta 3): looginen virhe aiemmassa säännössä kohteli tätä samoin kuin passiivista Postin
// API -ilmoitusta (molemmat 24h-jakso) - mutta ostajan OMA aktiivinen kuittaus ON jo hyväksyntä,
// ei ole syytä odottaa 24h sen päälle. Vapauttaa maksun VÄLITTÖMÄSTI (SHIPPED → DELIVERED
// suoraan tässä reitissä), ei enää käynnistä checkDeliveryTimeline()-jakson kautta kulkevaa
// odotusta. 24h-tarkastusikkuna on tarkoitettu VAIN passiiviselle "Posti sanoo toimitettu,
// ostaja ei ole vielä reagoinut" -tapaukselle (ei vielä toteutettu - odottaa oikeaa Postin
// Tracking API -integraatiota, ks. deliveryTimeline.ts).
router.post('/:id/confirm-delivery', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: String(req.params.id) } });
    if (!order || order.buyerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.status !== 'SHIPPED')
        return res.status(400).json({ error: 'Tilaus ei odota vastaanottokuittausta' });
    // Ei vaadi erillistä maksun vapautus-/capture-kutsua — Stripen destination charge (ks.
    // lib/stripe.ts createCheckoutSession) siirsi myyjän osuuden hänen tililleen jo
    // maksuhetkellä, tämä vain päivittää tilauksen tilan.
    const updated = await prisma_1.prisma.order.update({ where: { id: order.id }, data: { deliveryConfirmedAt: new Date(), status: 'DELIVERED' } });
    await (0, notify_1.notifyUser)(order.sellerId, 'PAYMENT_RELEASED', 'Maksu vapautettu', 'Ostaja kuittasi tilauksen vastaanotetuksi — maksu on vapautettu sinulle heti.', '/dashboard/tilaukset');
    await (0, notify_1.notifyUser)(order.buyerId, 'ORDER_DELIVERED', 'Kauppa suoritettu', 'Kiitos kuittauksesta — kauppa on nyt suoritettu.', '/ostot');
    res.json(updated);
});
// POST /orders/:id/dispute — ostaja ilmoittaa ongelmasta
// Reklamaatio-oikeuden erottelu (ks. CLAUDE.md "Toimituksen aikataulu ja maksuturva",
// "RISTIRIITA KORJATTU 2026-09-05"): ostajan OMA aktiivinen "Hyväksyn"-kuittaus
// (deliveryConfirmedAt asetettu POST /:id/confirm-delivery:ssä) on lopullinen - ei enää
// reklamaatio-oikeutta sen jälkeen, koska aktiivisen hyväksynnän koko tarkoitus on "kaikki
// kunnossa". Passiivinen 14pv-automaattivapautus (deliveryConfirmedAt jää nulliksi, ks.
// jobs/deliveryTimeline.ts) SÄILYTTÄÄ käyttöehtojen 6.3 mukaisen 3 vrk:n reklamaatio-oikeuden,
// koska ostaja ei koskaan itse vahvistanut mitään olevan kunnossa. Ei uutta kenttää tähän -
// updatedAt riittää ajankohdaksi koska mikään muu ei koske Order-riviä DELIVERED-siirtymän
// jälkeen ennen mahdollista reklamaatiota.
const PASSIVE_DISPUTE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
router.post('/:id/dispute', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: String(req.params.id) } });
    if (!order || order.buyerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    const passiveDeliveredRecently = order.status === 'DELIVERED' && order.deliveryConfirmedAt === null
        && (Date.now() - order.updatedAt.getTime()) <= PASSIVE_DISPUTE_WINDOW_MS;
    if (order.status !== 'SHIPPED' && !passiveDeliveredRecently) {
        return res.status(400).json({ error: 'Tilaus ei ole enää reklamoitavissa' });
    }
    const reason = String(req.body?.reason ?? '').trim().slice(0, 1000) || 'Ei tarkennettu';
    const updated = await prisma_1.prisma.order.update({ where: { id: order.id }, data: { status: 'DISPUTED', disputeReason: reason } });
    // TODO: ilmoitus SKRM:n adminille kun admin-paneeli on olemassa
    console.log(`[dispute] Tilaus ${order.id} reklamoitu: ${reason}`);
    await (0, notify_1.notifyUser)(order.sellerId, 'DISPUTE_OPENED', 'Ostaja avasi reklamaation', reason, '/dashboard/tilaukset');
    await (0, notify_1.notifyUser)(order.buyerId, 'DISPUTE_OPENED', 'Reklamaatio vastaanotettu', 'Olemme vastaanottaneet reklamaatiosi ja selvitämme asiaa.', '/ostot');
    res.json(updated);
});
// POST /orders/:id/review — ostaja arvostelee myyjän tai myyjä ostajan, kun tilaus on toimitettu
router.post('/:id/review', auth_1.authMiddleware, async (req, res) => {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: String(req.params.id) },
        include: { buyer: { select: { username: true } }, seller: { select: { username: true } } },
    });
    if (!order)
        return res.status(404).json({ error: 'Tilausta ei löydy' });
    let revieweeId;
    let revieweeUsername;
    if (order.buyerId === req.userId) {
        revieweeId = order.sellerId;
        revieweeUsername = order.seller.username;
    }
    else if (order.sellerId === req.userId) {
        revieweeId = order.buyerId;
        revieweeUsername = order.buyer.username;
    }
    else
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (order.status !== 'DELIVERED')
        return res.status(400).json({ error: 'Tilaus ei ole vielä toimitettu' });
    const rating = Math.round(Number(req.body?.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5)
        return res.status(400).json({ error: 'Arvosanan tulee olla 1-5' });
    const comment = String(req.body?.comment ?? '').trim().slice(0, 1000) || null;
    try {
        const review = await prisma_1.prisma.review.create({
            data: { orderId: order.id, reviewerId: req.userId, revieweeId, rating, comment },
        });
        await (0, notify_1.notifyUser)(revieweeId, 'REVIEW_RECEIVED', 'Sait uuden arvostelun', `${rating}/5 tähteä`, `/u/${revieweeUsername}`);
        res.status(201).json(review);
    }
    catch (e) {
        if (e.code === 'P2002')
            return res.status(400).json({ error: 'Olet jo arvostellut tämän kaupan' });
        res.status(500).json({ error: 'Arvostelun tallennus epäonnistui' });
    }
});
exports.default = router;
