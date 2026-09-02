"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndSendPasswordResetToken = createAndSendPasswordResetToken;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../db/prisma");
const resend_1 = require("./resend");
// Jaettu apuri sekä /auth/forgot-password:lle (käyttäjä pyytää itse) että admin-paneelin
// "Lähetä salasanan palautuslinkki" -napille (POST /admin/users/:id/send-password-reset) —
// sama token-luonti- ja lähetyslogiikka, ei kahta eri koodausta samalle asialle.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
async function createAndSendPasswordResetToken(user) {
    const rawToken = crypto_1.default.randomBytes(32).toString('hex');
    const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
    await prisma_1.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma_1.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });
    const resetUrl = `${FRONTEND_URL}/nollaa-salasana?token=${rawToken}`;
    await (0, resend_1.sendPasswordResetEmail)(user.email, user.name, resetUrl);
}
