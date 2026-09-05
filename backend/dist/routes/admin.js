"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const notify_1 = require("../lib/notify");
const passwordReset_1 = require("../lib/passwordReset");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware, admin_1.adminMiddleware);
// GET /admin/reports?status=PENDING|REVIEWED — ilmiantolista + kohteen esikatselu
router.get('/reports', async (req, res) => {
    const { status } = req.query;
    const where = {};
    if (status === 'PENDING' || status === 'REVIEWED')
        where.status = status;
    const reports = await prisma_1.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { reporter: { select: { username: true, name: true } } },
    });
    const enriched = await Promise.all(reports.map(async (r) => {
        const target = r.targetType === 'product'
            ? await prisma_1.prisma.product.findUnique({ where: { id: r.targetId }, select: { id: true, name: true, sellerId: true, saleType: true } })
            : r.targetType === 'show'
                ? await prisma_1.prisma.show.findUnique({ where: { id: r.targetId }, select: { id: true, title: true, sellerId: true, status: true } })
                : await prisma_1.prisma.user.findUnique({ where: { id: r.targetId }, select: { id: true, name: true, username: true, role: true } });
        return { ...r, target };
    }));
    res.json(enriched);
});
// PATCH /admin/reports/:id — merkitse käsitellyksi
router.patch('/reports/:id', async (req, res) => {
    const report = await prisma_1.prisma.report.update({ where: { id: String(req.params.id) }, data: { status: 'REVIEWED' } });
    res.json(report);
});
// DELETE /admin/products/:id — poista tuote/huutokauppa, ilmoita myyjälle syy
router.delete('/products/:id', async (req, res) => {
    const id = String(req.params.id);
    const { reason } = req.body;
    if (!reason || !String(reason).trim())
        return res.status(400).json({ error: 'Poiston syy vaaditaan' });
    const product = await prisma_1.prisma.product.findUnique({ where: { id }, include: { orderItems: { include: { order: true } } } });
    if (!product)
        return res.status(404).json({ error: 'Tuotetta ei löydy' });
    // Sama korjaus kuin POST /products/:id DELETE:ssä (ks. sen kommentti) — peruutetun
    // tilauksen OrderItem ei saa estää poistoa, koska mitään rahaa ei koskaan liikkunut.
    const realOrderItems = product.orderItems.filter(oi => oi.order.status !== 'CANCELLED');
    if (realOrderItems.length > 0)
        return res.status(400).json({ error: 'Tuote on osa tilausta, ei voida poistaa' });
    await prisma_1.prisma.autoBid.deleteMany({ where: { productId: id } });
    await prisma_1.prisma.bid.deleteMany({ where: { productId: id } });
    await prisma_1.prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma_1.prisma.message.updateMany({ where: { productId: id }, data: { productId: null } });
    await prisma_1.prisma.orderItem.deleteMany({ where: { productId: id, order: { status: 'CANCELLED' } } });
    await prisma_1.prisma.product.delete({ where: { id } });
    await (0, notify_1.notifyUser)(product.sellerId, 'LISTING_REMOVED', 'Tuotteesi on poistettu', `Tuotteesi "${product.name}" on poistettu ylläpidon toimesta. Syy: ${reason}. Kysyttävää? support@habahub.fi`);
    res.json({ ok: true });
});
// DELETE /admin/shows/:id — poista live, irrota tuotteet (jäävät olemaan), ilmoita myyjälle syy
router.delete('/shows/:id', async (req, res) => {
    const id = String(req.params.id);
    const { reason } = req.body;
    if (!reason || !String(reason).trim())
        return res.status(400).json({ error: 'Poiston syy vaaditaan' });
    const show = await prisma_1.prisma.show.findUnique({ where: { id } });
    if (!show)
        return res.status(404).json({ error: 'Lähetystä ei löydy' });
    await prisma_1.prisma.product.updateMany({ where: { showId: id }, data: { showId: null } });
    await prisma_1.prisma.bid.deleteMany({ where: { showId: id } });
    await prisma_1.prisma.show.delete({ where: { id } });
    await (0, notify_1.notifyUser)(show.sellerId, 'LISTING_REMOVED', 'Lähetyksesi on poistettu', `Lähetyksesi "${show.title}" on poistettu ylläpidon toimesta. Syy: ${reason}. Kysyttävää? support@habahub.fi`);
    res.json({ ok: true });
});
// Hakee käyttäjän uusimman AKTIIVISEN bannin (endsAt tulevaisuudessa) - jaettu apuri
// GET /users:lle ja tarvittaessa muualle. Palauttaa null jos ei aktiivista bannia
// (vanhat/umpeutuneet bannit jäävät historiaan, ei näytetä admin-paneelissa "voimassa"-tilassa).
async function findActiveBan(userId) {
    return prisma_1.prisma.ban.findFirst({
        where: { userId, endsAt: { gt: new Date() } },
        orderBy: { endsAt: 'desc' },
        select: { id: true, reason: true, endsAt: true, createdAt: true },
    });
}
// GET /admin/users?search=nimi&page=1&pageSize=30 — käyttäjähallintapaneelin lista.
// Palauttaa canStream/customCommissionRate/customCommissionCap/activeBan (ks. INTEGRATION.md)
// sekä createdAt/verified admin-käyttäjähallintapaneelia varten.
// KORJATTU 2026-09-04 (ks. CLAUDE.md "Admin-käyttäjälistan kaksi puutetta"): search ei ole enää
// ehto sille näytetäänkö mitään ollenkaan — ilman hakua näytetään kaikki käyttäjät sivutettuna,
// hakua käytetään vain jo näkyvän listan suodattamiseen. Lisätty sivutus koska pelkkä `take: 10`
// ei riitä kun käyttäjämäärä kasvaa satoihin.
router.get('/users', async (req, res) => {
    const { search } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 30));
    const where = search && String(search).trim().length >= 2
        ? {
            OR: [
                { username: { contains: String(search).trim(), mode: 'insensitive' } },
                { email: { contains: String(search).trim(), mode: 'insensitive' } },
                { name: { contains: String(search).trim(), mode: 'insensitive' } },
            ],
        }
        : {};
    const [users, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where,
            select: { id: true, name: true, username: true, email: true, role: true, canStream: true, customCommissionRate: true, customCommissionCap: true, createdAt: true, verified: true },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma_1.prisma.user.count({ where }),
    ]);
    const enriched = await Promise.all(users.map(async (u) => ({ ...u, activeBan: await findActiveBan(u.id) })));
    res.json({ users: enriched, total, page, pageSize });
});
// PATCH /admin/users/:id — osittainen päivitys (canStream/customCommissionRate/
// customCommissionCap). Kaikki kentät valinnaisia, vain annetut päivitetään.
router.patch('/users/:id', async (req, res) => {
    const userId = String(req.params.id);
    const { canStream, customCommissionRate, customCommissionCap } = req.body;
    const existing = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!existing)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    const data = {};
    if (typeof canStream === 'boolean')
        data.canStream = canStream;
    if (customCommissionRate !== undefined) {
        if (customCommissionRate !== null && (typeof customCommissionRate !== 'number' || !isFinite(customCommissionRate) || customCommissionRate < 0)) {
            return res.status(400).json({ error: 'Virheellinen komissioprosentti' });
        }
        data.customCommissionRate = customCommissionRate;
    }
    if (customCommissionCap !== undefined) {
        if (customCommissionCap !== null && (typeof customCommissionCap !== 'number' || !isFinite(customCommissionCap) || customCommissionCap < 0)) {
            return res.status(400).json({ error: 'Virheellinen komissiokatto' });
        }
        data.customCommissionCap = customCommissionCap;
    }
    const updated = await prisma_1.prisma.user.update({
        where: { id: userId },
        data,
        select: { id: true, name: true, username: true, email: true, role: true, canStream: true, customCommissionRate: true, customCommissionCap: true },
    });
    res.json({ ...updated, activeBan: await findActiveBan(userId) });
});
// POST /admin/users/:id/ban — manuaalinen banni (erillinen automaattisesta maksurikebannista)
router.post('/users/:id/ban', async (req, res) => {
    const userId = String(req.params.id);
    const { reason, days } = req.body;
    if (!reason || !String(reason).trim())
        return res.status(400).json({ error: 'Bannin syy vaaditaan' });
    const durationDays = Number(days) > 0 ? Number(days) : 30;
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const ban = await prisma_1.prisma.ban.create({ data: { userId, reason, endsAt } });
    await (0, notify_1.notifyUser)(userId, 'BAN_ISSUED', 'Tilisi on estetty', `Tilisi on estetty ${endsAt.toLocaleDateString('fi-FI')} asti. Syy: ${reason}`);
    res.json(ban);
});
// DELETE /admin/users/:id/ban — poistaa aktiivisen bannin asettamalla sen endsAt:n
// menneisyyteen (ei poisteta riviä - banni jää historiaan, vain lakkaa olemasta aktiivinen).
router.delete('/users/:id/ban', async (req, res) => {
    const userId = String(req.params.id);
    const active = await prisma_1.prisma.ban.findFirst({ where: { userId, endsAt: { gt: new Date() } }, orderBy: { endsAt: 'desc' } });
    if (!active)
        return res.status(404).json({ error: 'Ei aktiivista bannia' });
    await prisma_1.prisma.ban.update({ where: { id: active.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    res.json({ ok: true });
});
// POST /admin/users/:id/send-password-reset — käyttää samaa token-luontia/sähköpostia kuin
// käyttäjän oma /auth/forgot-password (ks. lib/passwordReset.ts), admin käynnistää sen
// käyttäjän puolesta esim. tukipyynnön yhteydessä.
router.post('/users/:id/send-password-reset', async (req, res) => {
    const userId = String(req.params.id);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    await (0, passwordReset_1.createAndSendPasswordResetToken)(user);
    res.json({ ok: true });
});
// GET /admin/ad — palauttaa mainosbannerin nykyisen sisällön (myös enabled=false-tilassa,
// toisin kuin julkinen GET /ad) esitäyttääkseen admin-lomakkeen. Luo tyhjän oletusrivin jos
// yhtään ei ole vielä tallennettu, ettei frontendin tarvitse käsitellä null-tilaa erikseen.
router.get('/ad', async (_req, res) => {
    const ad = await prisma_1.prisma.adSlot.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main' } });
    res.json(ad);
});
// PATCH /admin/ad — päivittää mainosbannerin sisällön. Kuva base64-merkkijonona samaan
// tapaan kuin muuallakin sivustolla (ks. CLAUDE.md "Kuvat"-koodaussääntö).
router.patch('/ad', async (req, res) => {
    const { enabled, eyebrow, title, body, ctaText, ctaHref, imageUrl } = req.body;
    const data = {};
    if (typeof enabled === 'boolean')
        data.enabled = enabled;
    if (typeof eyebrow === 'string')
        data.eyebrow = eyebrow;
    if (typeof title === 'string')
        data.title = title;
    if (typeof body === 'string')
        data.body = body;
    if (typeof ctaText === 'string')
        data.ctaText = ctaText;
    if (typeof ctaHref === 'string')
        data.ctaHref = ctaHref;
    if (typeof imageUrl === 'string' || imageUrl === null)
        data.imageUrl = imageUrl;
    const ad = await prisma_1.prisma.adSlot.upsert({ where: { id: 'main' }, update: data, create: { id: 'main', ...data } });
    res.json(ad);
});
exports.default = router;
