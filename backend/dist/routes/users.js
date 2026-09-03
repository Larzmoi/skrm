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
const resend_1 = require("../lib/resend");
const router = (0, express_1.Router)();
// GET /users/me/stream-info — myyjän pysyvät OBS-asetukset (RTMP-palvelin + stream key) PLUS
// oma esikatselutoken (LiveKit-migraatio 2026-08-09, ks. CLAUDE.md "PÄÄTÖS 2026-08-09").
// Generoi Ingressin lazily jos sitä ei vielä ole — toimii ilman että lähetystä on luotu, joten
// dashboard voi näyttää nämä heti sivulle tultaessa.
// Huom: pitää olla ennen /:username-reittiä ettei "me" osu käyttäjänimi-parametriin.
router.get('/me/stream-info', auth_1.authMiddleware, async (req, res) => {
    const streamKey = await (0, livekit_1.getOrCreateStreamKey)(req.userId);
    const roomName = (0, livekit_1.roomNameForSeller)(req.userId);
    const previewToken = await (0, livekit_1.createViewerToken)(roomName, `preview-${req.userId}`, 'Esikatselu');
    res.json({ rtmpUrl: livekit_1.RTMP_URL, streamKey, wsUrl: livekit_1.LIVEKIT_WS_URL_PUBLIC, previewToken, roomName });
});
// POST /users/me/stream-key/regenerate — mitätöi vanhan avaimen ja luo uuden (esim. jos vuotanut)
router.post('/me/stream-key/regenerate', auth_1.authMiddleware, async (req, res) => {
    const streamKey = await (0, livekit_1.regenerateStreamKey)(req.userId);
    const roomName = (0, livekit_1.roomNameForSeller)(req.userId);
    const previewToken = await (0, livekit_1.createViewerToken)(roomName, `preview-${req.userId}`, 'Esikatselu');
    res.json({ rtmpUrl: livekit_1.RTMP_URL, streamKey, wsUrl: livekit_1.LIVEKIT_WS_URL_PUBLIC, previewToken, roomName });
});
// POST /users/me/publish-token — julkaisuoikeudellinen token puhelimen suoraan
// selainstriimaukseen ilman OBS:aa/Ingressiä (ks. CLAUDE.md "Selainpohjainen
// mobiilistriimaus"). Sama huone kuin OBS:n Ingress käyttäisi ("seller-{userId}") —
// katsojat eivät tiedä/välitä kumpi tapa julkaisi, VideoPlayer tilaa vain trackit.
router.post('/me/publish-token', auth_1.authMiddleware, async (req, res) => {
    const roomName = (0, livekit_1.roomNameForSeller)(req.userId);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
    const token = await (0, livekit_1.createPublisherToken)(roomName, req.userId, user?.username ?? 'Myyjä');
    res.json({ wsUrl: livekit_1.LIVEKIT_WS_URL_PUBLIC, token, roomName });
});
function getOptionalUserId(req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token)
        return null;
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET).userId;
    }
    catch {
        return null;
    }
}
// GET /users/:username — julkinen profiili (storefront: myyjän tiedot + tulevat lähetykset/huutokaupat)
router.get('/:username', async (req, res) => {
    const user = await prisma_1.prisma.user.findFirst({
        where: { username: decodeURIComponent(String(req.params.username)) },
        select: { id: true, name: true, username: true, avatarUrl: true, bio: true, createdAt: true, vacationUntil: true, vacationMessage: true },
    });
    if (!user)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    const followerCount = await prisma_1.prisma.follower.count({ where: { sellerId: user.id } });
    const currentUserId = getOptionalUserId(req);
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
        const existing = await prisma_1.prisma.follower.findUnique({
            where: { sellerId_followerId: { sellerId: user.id, followerId: currentUserId } },
        });
        isFollowing = !!existing;
    }
    const ratingAgg = await prisma_1.prisma.review.aggregate({
        where: { revieweeId: user.id },
        _avg: { rating: true },
        _count: true,
    });
    const now = new Date();
    const onVacation = !!(user.vacationUntil && user.vacationUntil > now);
    const upcomingShows = await prisma_1.prisma.show.findMany({
        where: { sellerId: user.id, status: 'SCHEDULED', scheduledAt: { gt: now } },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true, title: true, thumbnailUrl: true, scheduledAt: true, category: true },
    });
    const activeAuctions = await prisma_1.prisma.product.findMany({
        where: { sellerId: user.id, saleType: 'auction', status: 'PENDING', auctionEndsAt: { gt: now } },
        orderBy: { auctionEndsAt: 'asc' },
        select: { id: true, name: true, imageUrl: true, currentBid: true, startPrice: true, auctionEndsAt: true },
    });
    res.json({
        ...user, followerCount, isFollowing,
        avgRating: ratingAgg._avg.rating,
        reviewCount: ratingAgg._count,
        onVacation,
        upcomingShows,
        activeAuctions,
    });
});
// GET /users/:username/reviews — julkinen lista käyttäjän saamista arvosteluista
router.get('/:username/reviews', async (req, res) => {
    const user = await prisma_1.prisma.user.findFirst({
        where: { username: decodeURIComponent(String(req.params.username)) },
        select: { id: true },
    });
    if (!user)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    const reviews = await prisma_1.prisma.review.findMany({
        where: { revieweeId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { reviewer: { select: { name: true, username: true, avatarUrl: true } } },
    });
    res.json(reviews);
});
// GET /users/:username/followers — julkinen lista käyttäjän seuraajista (ks. CLAUDE.md
// 2026-09-04, omistajan pyyntö "olisi mukava nähdä seuraajat" — pelkkä lukumäärä oli jo
// olemassa, tämä lisää oikean listan sen taakse).
router.get('/:username/followers', async (req, res) => {
    const user = await prisma_1.prisma.user.findFirst({
        where: { username: decodeURIComponent(String(req.params.username)) },
        select: { id: true },
    });
    if (!user)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    const followers = await prisma_1.prisma.follower.findMany({
        where: { sellerId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { follower: { select: { name: true, username: true, avatarUrl: true } } },
    });
    res.json(followers.map(f => f.follower));
});
// POST /users/:username/follow — seuraa/lopeta seuraaminen (toggle)
router.post('/:username/follow', auth_1.authMiddleware, async (req, res) => {
    const seller = await prisma_1.prisma.user.findFirst({
        where: { username: decodeURIComponent(String(req.params.username)) },
    });
    if (!seller)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    if (seller.id === req.userId)
        return res.status(400).json({ error: 'Et voi seurata itseäsi' });
    const existing = await prisma_1.prisma.follower.findUnique({
        where: { sellerId_followerId: { sellerId: seller.id, followerId: req.userId } },
    });
    if (existing) {
        await prisma_1.prisma.follower.delete({ where: { id: existing.id } });
    }
    else {
        await prisma_1.prisma.follower.create({ data: { sellerId: seller.id, followerId: req.userId } });
        // Vain uudesta seuraamisesta ilmoitetaan, ei seuraamisen lopettamisesta - in-app-
        // ilmoitus riittää tähän (ei push, ks. CLAUDE.md "Push-ilmoitukset" - push on rajattu
        // koskemaan "seurattu myyjä meni liveen" -tapahtumaa).
        const follower = await prisma_1.prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
        if (follower) {
            await (0, notify_1.notifyUser)(seller.id, 'NEW_FOLLOWER', 'Uusi seuraaja', `${follower.username} alkoi seurata sinua`, `/u/${follower.username}`);
        }
    }
    const followerCount = await prisma_1.prisma.follower.count({ where: { sellerId: seller.id } });
    res.json({ following: !existing, followerCount });
});
const USERNAME_CHANGE_COOLDOWN_DAYS = 365;
// PATCH /users/me — päivitä oma profiili
router.patch('/me', auth_1.authMiddleware, async (req, res) => {
    const { name, bio, phone, address, postalCode, city, businessId, email, username, avatarUrl, vacationUntil, vacationMessage, newsletterOptIn } = req.body;
    const current = await prisma_1.prisma.user.findUnique({ where: { id: req.userId } });
    if (!current)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    const data = {
        name: name ?? undefined, bio: bio ?? undefined,
        phone: phone ?? undefined, address: address ?? undefined,
        postalCode: postalCode ?? undefined, city: city ?? undefined,
        businessId: businessId ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
    };
    // Lomamoodi — 'in' tarkistus koska nollaus (pois päältä) pitää voida lähettää eksplisiittisenä nullina,
    // toisin kuin muut kentät joissa ?? undefined riittää (ne eivät tarvitse "tyhjennä"-tilaa erikseen)
    if ('vacationUntil' in req.body)
        data.vacationUntil = vacationUntil ? new Date(vacationUntil) : null;
    if ('vacationMessage' in req.body)
        data.vacationMessage = vacationMessage || null;
    if (typeof newsletterOptIn === 'boolean')
        data.newsletterOptIn = newsletterOptIn;
    if (typeof email === 'string' && email.trim() && email.trim() !== current.email) {
        data.email = email.trim();
    }
    const trimmedUsername = typeof username === 'string' ? username.trim() : undefined;
    if (trimmedUsername && trimmedUsername !== current.username) {
        if (current.usernameChangedAt) {
            const nextAllowed = new Date(current.usernameChangedAt);
            nextAllowed.setDate(nextAllowed.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS);
            if (nextAllowed > new Date()) {
                return res.status(400).json({
                    error: `Käyttäjänimen voi vaihtaa kerran vuodessa. Voit vaihtaa sen taas ${nextAllowed.toLocaleDateString('fi-FI')}.`,
                });
            }
        }
        data.username = trimmedUsername;
        data.usernameChangedAt = new Date();
    }
    try {
        const user = await prisma_1.prisma.user.update({
            where: { id: req.userId },
            data,
            select: {
                id: true, name: true, username: true, email: true, bio: true, avatarUrl: true,
                phone: true, address: true, postalCode: true, city: true, businessId: true,
                usernameChangedAt: true, vacationUntil: true, vacationMessage: true, newsletterOptIn: true,
            },
        });
        // Fire-and-forget, ei blokkaa profiilipäivityksen vastausta - jos Resend-kutsu myöhästyy
        // tai epäonnistuu, käyttäjän oma tilailmoitus on jo tallennettu paikallisesti (ks.
        // syncNewsletterContact:n oma virheenkäsittely, sama epäonnistu-hiljaa-periaate kuin
        // sähköposteilla). Synkronoidaan vain jos tila oikeasti muuttui tässä pyynnössä.
        if ('newsletterOptIn' in data)
            void (0, resend_1.syncNewsletterContact)(user.email, user.name, user.newsletterOptIn);
        res.json(user);
    }
    catch (e) {
        if (e.code === 'P2002') {
            const target = JSON.stringify(e.meta?.target ?? '');
            if (target.includes('email'))
                return res.status(400).json({ error: 'Sähköposti on jo käytössä' });
            if (target.includes('username'))
                return res.status(400).json({ error: 'Käyttäjänimi on jo varattu' });
            return res.status(400).json({ error: 'Tieto on jo käytössä' });
        }
        res.status(500).json({ error: 'Palvelinvirhe' });
    }
});
exports.default = router;
