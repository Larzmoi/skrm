"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /notifications — omat ilmoitukset, uusimmat ensin
router.get('/', auth_1.authMiddleware, async (req, res) => {
    const notifications = await prisma_1.prisma.notification.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json(notifications);
});
// POST /notifications/read — merkitse luetuksi (body { id }), tai kaikki jos id puuttuu
router.post('/read', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.body;
    if (id) {
        await prisma_1.prisma.notification.updateMany({ where: { id: String(id), userId: req.userId }, data: { read: true } });
    }
    else {
        await prisma_1.prisma.notification.updateMany({ where: { userId: req.userId, read: false }, data: { read: true } });
    }
    res.json({ ok: true });
});
// DELETE /notifications/:id — poista oma ilmoitus listasta
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    const { count } = await prisma_1.prisma.notification.deleteMany({ where: { id: String(req.params.id), userId: req.userId } });
    if (count === 0)
        return res.status(404).json({ error: 'Ilmoitusta ei löydy' });
    res.json({ ok: true });
});
exports.default = router;
