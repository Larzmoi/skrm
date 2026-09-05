"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const router = (0, express_1.Router)();
// GET /ad — julkinen, etusivun mainosbannerin sisältö (ks. CLAUDE.md "Iso testauskierros
// 2026-09-04" kohta 6). Palauttaa null jos riviä ei ole vielä luotu tai enabled=false —
// frontend ei renderöi banneria ollenkaan silloin.
router.get('/', async (_req, res) => {
    const ad = await prisma_1.prisma.adSlot.findUnique({ where: { id: 'main' } });
    if (!ad || !ad.enabled)
        return res.json(null);
    res.json(ad);
});
exports.default = router;
