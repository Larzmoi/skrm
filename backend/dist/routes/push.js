"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /push/subscribe — tallentaa selaimen PushSubscription-olion (upsert endpointin
// mukaan, koska sama selain voi tilata uudestaan esim. avainten vaihtuessa)
router.post('/subscribe', auth_1.authMiddleware, async (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Virheellinen tilaus' });
    }
    await prisma_1.prisma.pushSubscription.upsert({
        where: { endpoint },
        create: { userId: req.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        update: { userId: req.userId, p256dh: keys.p256dh, auth: keys.auth },
    });
    res.status(201).json({ ok: true });
});
// POST /push/unsubscribe — poistaa tilauksen (esim. käyttäjä kytkee ilmoitukset pois)
router.post('/unsubscribe', auth_1.authMiddleware, async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint)
        return res.status(400).json({ error: 'endpoint vaaditaan' });
    await prisma_1.prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.userId } });
    res.json({ ok: true });
});
exports.default = router;
