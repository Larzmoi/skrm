"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const router = (0, express_1.Router)();
// GET /ad — julkinen, etusivun mainoskaruselli (ks. CLAUDE.md "Mainostila karuselliksi"
// 2026-09-11 - aiemmin yksi rivi/null, nyt taulukko). Palauttaa vain enabled=true-mainokset,
// luontijärjestyksessä - frontend ei renderöi banneria ollenkaan jos taulukko on tyhjä.
router.get('/', async (_req, res) => {
    const ads = await prisma_1.prisma.adSlot.findMany({ where: { enabled: true }, orderBy: { createdAt: 'asc' } });
    res.json(ads);
});
exports.default = router;
