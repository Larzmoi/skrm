"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = adminMiddleware;
const prisma_1 = require("../db/prisma");
// Käytettävä authMiddlewaren jälkeen — tarkistaa req.userId:n roolin tuoreena kannasta (JWT ei kanna roolia)
async function adminMiddleware(req, res, next) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN')
        return res.status(403).json({ error: 'Ei ylläpito-oikeutta' });
    next();
}
