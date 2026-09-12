"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOptionalUserId = getOptionalUserId;
exports.canViewSoldProduct = canViewSoldProduct;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../db/prisma");
// Sama kevyt "lue token jos sattuu olemaan mukana" -apuri kuin users.ts:n GET /:username
// -reitillä (isFollowing) - nämä reitit (GET /products/:id, GET /auctions/:id) ovat julkisia
// (ei authMiddleware, anonyymitkin selaavat niitä), mutta jos kirjautunut käyttäjä katsoo,
// hänen identiteettinsä pitää silti tietää myyty-tuotteen näkyvyystarkistusta varten alla.
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
// Myyty tuote/huutokauppakohde piilotetaan julkisesta näkymästä — omistajan pyyntö 2026-09-12:
// jos myyjällä on useita samannäköisiä listauksia (esim. sama kortti 5 kpl eri ilmoituksina),
// myyty listaus jäi aiemmin silti julkisesti nähtäväksi (GET /products/:id ei koskaan
// tarkistanut statusta) - vain myyjä, tähän tuotteeseen liittyvän OrderItemin kautta
// tunnistettu ostaja, tai admin saa katsoa sitä enää sen jälkeen kun status on 'SOLD'.
// Kaikille muille sivu näyttää saman "ei löydy" -tilan kuin oikeasti olemattomalle tuotteelle -
// ei paljasteta ettei kyse ole pelkästä puuttuvasta ID:stä.
async function canViewSoldProduct(req, product) {
    const currentUserId = getOptionalUserId(req);
    if (!currentUserId)
        return false;
    if (currentUserId === product.sellerId)
        return true;
    if (product.orderItems.some(oi => oi.order.buyerId === currentUserId))
        return true;
    const user = await prisma_1.prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } });
    return user?.role === 'ADMIN';
}
