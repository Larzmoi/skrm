"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const livekit_1 = require("../lib/livekit");
const notify_1 = require("../lib/notify");
const push_1 = require("../lib/push");
const router = (0, express_1.Router)();
// Julkinen valinta — streamKey on salainen eikä saa koskaan päätyä julkisiin vastauksiin.
// hlsUrl on jäänne MediaMTX-ajalta (ks. CLAUDE.md "PÄÄTÖS 2026-08-09: Vaihto MediaMTX ->
// LiveKit") — LiveKitissä katsoja ei tarvitse URL:ia vaan huoneen nimen (johdettavissa
// suoraan sellerId:stä, ks. roomNameForSeller) + tuoreen tokenin (POST /shows/:id/viewer-token).
const publicShowSelect = {
    id: true, title: true, sellerId: true, status: true, category: true, alakategoria: true, city: true, thumbnailUrl: true,
    scheduledAt: true, startedAt: true, endedAt: true,
    viewerCount: true, createdAt: true,
};
// GET /shows — julkiset live ja tulevat.
// Huom: SCHEDULED-lähetys jolla ei ole scheduledAt-ajankohtaa on myyjän yksityinen esikatselu-/
// testilähetys (ks. dashboard/lähetys "Luo lähetys ja testaa yhteys" — ei koskaan aseta scheduledAt:ia),
// ei todellinen julkisesti ilmoitettu "tuleva" lähetys — sellaista ei näytetä tässä listauksessa
// ennen kuin se joko menee oikeasti LIVE:ksi tai myyjä ajastaa sille julkaisuajan.
router.get('/', async (req, res) => {
    const { status } = req.query;
    const select = {
        ...publicShowSelect,
        seller: { select: { id: true, name: true, username: true } },
        products: { where: { status: 'PENDING' }, orderBy: { order: 'asc' }, take: 5 },
    };
    if (status) {
        const where = String(status) === 'SCHEDULED'
            ? { status: 'SCHEDULED', scheduledAt: { gt: new Date() } }
            : { status: String(status) };
        const shows = await prisma_1.prisma.show.findMany({ where, orderBy: { scheduledAt: 'asc' }, select });
        return res.json(shows);
    }
    // Live ensin, sitten tulevat ajastetut ajanjärjestyksessä. Yksi orderBy: scheduledAt:'asc'
    // olisi haudannut käynnissä olevan liven tulevien ajastettujen taakse - ad-hoc aloitettu
    // live (esim. "Luo lähetys ja testaa yhteys") ei koskaan aseta scheduledAt:ia, ja Postgresin
    // oletus ASC-järjestyksessä on NULLS LAST, joten se olisi pudonnut listan loppuun.
    // scheduledAt: { gt: now } jättää pois myös menneisyyteen jääneet ajastukset joita myyjä
    // ei koskaan aloittanut/päättänyt - eivät ole enää "tulevia", eivät kuulu tähän listaan.
    const [live, scheduled] = await Promise.all([
        prisma_1.prisma.show.findMany({ where: { status: 'LIVE' }, orderBy: { startedAt: 'desc' }, select }),
        prisma_1.prisma.show.findMany({ where: { status: 'SCHEDULED', scheduledAt: { gt: new Date() } }, orderBy: { scheduledAt: 'asc' }, select }),
    ]);
    res.json([...live, ...scheduled]);
});
// GET /shows/mine — omat lähetykset (kaikki statukset) — huom: ennen /:id-reittiä ettei "mine" osu :id-parametriin
router.get('/mine', auth_1.authMiddleware, async (req, res) => {
    const shows = await prisma_1.prisma.show.findMany({
        where: { sellerId: req.userId },
        orderBy: { scheduledAt: 'asc' },
        select: publicShowSelect,
    });
    res.json(shows);
});
// GET /shows/:id
router.get('/:id', async (req, res) => {
    const show = await prisma_1.prisma.show.findUnique({
        where: { id: String(req.params.id) },
        select: {
            ...publicShowSelect,
            seller: { select: { id: true, name: true, username: true } },
            products: { orderBy: { order: 'asc' } },
        },
    });
    if (!show)
        return res.status(404).json({ error: 'Lähetystä ei löydy' });
    res.json(show);
});
// POST /shows — luo lähetys. Ei enää generoi/tallenna striimi-URLia tähän riviin — LiveKitissä
// katsoja liittyy huoneeseen (johdettu sellerId:stä) tuoreella tokenilla, ei kiinteällä URL:lla.
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { title, category, alakategoria, city, scheduledAt, thumbnailUrl } = req.body;
    if (!title)
        return res.status(400).json({ error: 'Nimi vaaditaan' });
    // Striimausoikeus on admin-myönnettävä (ks. CLAUDE.md/INTEGRATION.md 2026-09-02,
    // User.canStream) - frontendin kytkin ei itsessään estä mitään, tämä backend-tarkistus on
    // se mikä oikeasti rajoittaa pääsyn.
    const streamer = await prisma_1.prisma.user.findUnique({ where: { id: req.userId }, select: { canStream: true } });
    if (!streamer?.canStream) {
        return res.status(403).json({ error: 'Striimausoikeutta ei ole vielä myönnetty' });
    }
    // Varmistaa että myyjän Ingress on olemassa (lazy-luonti) vaikka ei suoraan tarvita tässä.
    await (0, livekit_1.getOrCreateStreamKey)(req.userId);
    const show = await prisma_1.prisma.show.create({
        data: {
            title,
            category: category ?? null,
            alakategoria: alakategoria ?? null,
            city: city ?? null,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            sellerId: req.userId,
            thumbnailUrl: thumbnailUrl ?? null,
        },
    });
    res.status(201).json(show);
});
// GET /shows/:id/stream-info — hae RTMP-tiedot myyjälle (OBS-striimausta varten)
// Huom: streamKey on pysyvä ja käyttäjäkohtainen — sama kaikilla myyjän lähetyksillä.
// Ks. myös GET /users/me/stream-info, joka toimii ilman että lähetystä on vielä luotu.
router.get('/:id/stream-info', auth_1.authMiddleware, async (req, res) => {
    const show = await prisma_1.prisma.show.findUnique({ where: { id: String(req.params.id) } });
    if (!show || show.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    const streamKey = await (0, livekit_1.getOrCreateStreamKey)(req.userId);
    res.json({ rtmpUrl: livekit_1.RTMP_URL, streamKey });
});
// POST /shows/:id/viewer-token — tuore LiveKit-liittymistoken katsojalle (vain kuuntelu).
// Ei vaadi kirjautumista — katsominen on aina sallittua, vain chat/huuto vaatii tunnuksen
// (sama periaate kuin ennenkin). Kirjautumaton käyttäjä saa satunnaisen anonyymi-identiteetin.
router.post('/:id/viewer-token', async (req, res) => {
    const show = await prisma_1.prisma.show.findUnique({ where: { id: String(req.params.id) }, select: { sellerId: true, status: true } });
    if (!show)
        return res.status(404).json({ error: 'Lähetystä ei löydy' });
    let identity = `anon-${Math.random().toString(36).slice(2, 10)}`;
    let name = 'Katsoja';
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, username: true } });
            if (user) {
                identity = user.id;
                name = user.username;
            }
        }
        catch { }
    }
    const roomName = (0, livekit_1.roomNameForSeller)(show.sellerId);
    const viewerToken = await (0, livekit_1.createViewerToken)(roomName, identity, name);
    res.json({ wsUrl: livekit_1.LIVEKIT_WS_URL_PUBLIC, token: viewerToken, roomName });
});
// Ilmoittaa kaikille seuraajille (in-app + push, ks. CLAUDE.md "Push-ilmoitukset") kun
// seurattu myyjä menee liveen. Ei odoteta valmiiksi ennen vastauksen palautusta - myyjän
// "Aloita julkinen lähetys" -painallus ei saa jäädä roikkumaan ison seuraajamäärän takia.
async function notifyFollowersOfLiveShow(sellerId, sellerUsername, showTitle, showId) {
    const followers = await prisma_1.prisma.follower.findMany({ where: { sellerId }, select: { followerId: true } });
    const title = `${sellerUsername} on nyt livenä!`;
    const body = showTitle;
    const link = `/live/${showId}`;
    await Promise.all(followers.map(async (f) => {
        await (0, notify_1.notifyUser)(f.followerId, 'SELLER_LIVE', title, body, link).catch(() => { });
        await (0, push_1.sendPushToUser)(f.followerId, { title, body, url: link }).catch(() => { });
    }));
}
// PATCH /shows/:id/status — muuta tila (LIVE/ENDED)
router.patch('/:id/status', auth_1.authMiddleware, async (req, res) => {
    const show = await prisma_1.prisma.show.findUnique({ where: { id: String(req.params.id) }, include: { seller: { select: { username: true } } } });
    if (!show || show.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    const { status, thumbnailUrl } = req.body;
    const updated = await prisma_1.prisma.show.update({
        where: { id: String(req.params.id) },
        data: {
            status,
            thumbnailUrl: thumbnailUrl ?? undefined,
            startedAt: status === 'LIVE' ? new Date() : undefined,
            endedAt: status === 'ENDED' ? new Date() : undefined,
        },
    });
    // Ilman tätä katsojien selaimet eivät koskaan saa tietää että myyjä lopetti manuaalisesti
    // "Lopeta"-napista - vain automaattinen webhook-pohjainen lopetus (ks. webhooks.ts) emittasi
    // tämän ennen, joten manuaalisesti lopetettu lähetys jäi katsojan ruudulle roikkumaan.
    if (status === 'LIVE' || status === 'ENDED')
        (0, notify_1.emitToShow)(updated.id, 'show_status', { status });
    if (status === 'LIVE')
        notifyFollowersOfLiveShow(show.sellerId, show.seller.username, updated.title, updated.id).catch(console.error);
    res.json(updated);
});
// POST /shows/:id/claim-products — KRIITTINEN KORJAUS (ks. CLAUDE.md "Uudet löydökset
// 2026-08-13, osa 4" kohta 18): myyjän tuotejono (/lahetys-konsolin "products"-tila) haetaan
// GET /products/mine:sta, EI koskaan showId:n mukaan - eli tuotteita EI koskaan liitetty
// tietokannassa oikeaan Show-riviin. Tämän vuoksi GET /shows/:id:n products-relaatio (jota
// katsojan Shop-paneeli käyttää) oli aina tyhjä/vajaa muille kuin striimaavalle laitteelle,
// jonka oma paikallinen React-tila näytti jonon riippumatta tietokannan totuudesta. Kutsutaan
// aina kun myyjän konsoli avautuu - liittää kaikki myyjän odottavat (PENDING) tuotteet tähän
// showhun, jotta katsojat näkevät saman jonon palvelimelta haettuna.
router.post('/:id/claim-products', auth_1.authMiddleware, async (req, res) => {
    const show = await prisma_1.prisma.show.findUnique({ where: { id: String(req.params.id) } });
    if (!show || show.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    await prisma_1.prisma.product.updateMany({
        where: { sellerId: req.userId, status: 'PENDING' },
        data: { showId: show.id },
    });
    (0, notify_1.emitToShow)(show.id, 'products_updated', {});
    res.json({ ok: true });
});
// PATCH /shows/:id/reorder — tallentaa myyjän Jono-paneelin raahausjärjestyksen palvelimelle.
// KRIITTINEN KORJAUS (ks. CLAUDE.md "Esiasetusten kolme löydöstä" kohta 3): `/lahetys`-sivun
// jonon raahaus oli aiemmin puhtaasti paikallista React-tilaa, ei koskaan tallentunut minnekään
// - sivun päivitys menetti järjestyksen, eikä ostajan Shop-paneeli voinut koskaan lukea sitä.
// `Product.order`-kenttä oli jo olemassa schemassa mutta täysin kirjoittamaton (aina 0) - tämä
// on ensimmäinen paikka joka oikeasti asettaa sen. Ottaa tuote-ID-listan halutussa
// järjestyksessä, asettaa `order`:n listan indeksin mukaan (0, 1, 2, ...).
router.patch('/:id/reorder', auth_1.authMiddleware, async (req, res) => {
    const show = await prisma_1.prisma.show.findUnique({ where: { id: String(req.params.id) } });
    if (!show || show.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    const productIds = req.body?.productIds;
    if (!Array.isArray(productIds) || productIds.some(id => typeof id !== 'string')) {
        return res.status(400).json({ error: 'productIds (merkkijonotaulukko) vaaditaan' });
    }
    await prisma_1.prisma.$transaction(productIds.map((id, index) => prisma_1.prisma.product.updateMany({ where: { id, showId: show.id, sellerId: req.userId }, data: { order: index } })));
    (0, notify_1.emitToShow)(show.id, 'products_updated', {});
    res.json({ ok: true });
});
// DELETE /shows/:id — peruuta ajastettu lähetys (vain ennen kuin se on mennyt LIVE:ksi)
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    const show = await prisma_1.prisma.show.findUnique({ where: { id: String(req.params.id) } });
    if (!show || show.sellerId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    if (show.status !== 'SCHEDULED')
        return res.status(400).json({ error: 'Vain ajastetun lähetyksen voi peruuttaa' });
    await prisma_1.prisma.show.delete({ where: { id: show.id } });
    res.json({ ok: true });
});
exports.default = router;
