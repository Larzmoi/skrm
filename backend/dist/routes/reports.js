"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const telegram_1 = require("../lib/telegram");
const router = (0, express_1.Router)();
const VALID_TARGET_TYPES = ['product', 'show', 'user'];
const VALID_REASONS = ['prohibited', 'counterfeit', 'misleading', 'harassment', 'scam', 'other'];
// POST /reports — ilmianna tuote/huutokauppa (product), live (show) tai käyttäjä (user)
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { targetType, targetId, reason, description } = req.body;
    if (!VALID_TARGET_TYPES.includes(targetType))
        return res.status(400).json({ error: 'Virheellinen kohdetyyppi' });
    if (!VALID_REASONS.includes(reason))
        return res.status(400).json({ error: 'Virheellinen syy' });
    if (!targetId)
        return res.status(400).json({ error: 'Kohde puuttuu' });
    if (targetType === 'user' && String(targetId) === req.userId)
        return res.status(400).json({ error: 'Et voi ilmiantaa itseäsi' });
    const target = targetType === 'product'
        ? await prisma_1.prisma.product.findUnique({ where: { id: String(targetId) } })
        : targetType === 'show'
            ? await prisma_1.prisma.show.findUnique({ where: { id: String(targetId) } })
            : await prisma_1.prisma.user.findUnique({ where: { id: String(targetId) } });
    if (!target)
        return res.status(404).json({ error: 'Kohdetta ei löydy' });
    const report = await prisma_1.prisma.report.create({
        data: { reporterId: req.userId, targetType, targetId: String(targetId), reason, description: description || null },
    });
    // Live-lähetykset ovat kiireellisiä — käynnissä oleva sisältö vaatii nopean reagoinnin
    if (targetType === 'show') {
        const show = target;
        await (0, telegram_1.alertAdmin)(`Ilmianto käynnissä olevasta livestä: "${show.title}" (${show.id})\nSyy: ${reason}${description ? `\n${description}` : ''}`);
    }
    res.status(201).json({ ok: true, id: report.id });
});
exports.default = router;
