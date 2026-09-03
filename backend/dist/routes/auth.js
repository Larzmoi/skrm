"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../db/prisma");
const passwordReset_1 = require("../lib/passwordReset");
const resend_1 = require("../lib/resend");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    const { email, password, name, username, termsAccepted, privacyAccepted, policyAccepted } = req.body;
    if (!email || !password || !name || !username) {
        return res.status(400).json({ error: 'Täytä kaikki kentät' });
    }
    if (!termsAccepted || !privacyAccepted || !policyAccepted) {
        return res.status(400).json({ error: 'Käyttöehdot, tietosuojaseloste ja kaupankäyntipolitiikka on hyväksyttävä' });
    }
    try {
        const hash = await bcrypt_1.default.hash(password, 12);
        const now = new Date();
        const user = await prisma_1.prisma.user.create({
            data: { email, passwordHash: hash, name, username, termsAcceptedAt: now, privacyAcceptedAt: now, policyAcceptedAt: now },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        // Idempotentti käyttäjän luonnin kautta: sähköposti/käyttäjänimi on uniikki (P2002 alla
        // hoitaa duplikaatit), joten tämä koodipolku ajetaan enintään kerran per käyttäjä.
        void (0, resend_1.sendWelcomeEmail)(user.email, user.name, user.username);
        res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl, phone: user.phone, address: user.address, postalCode: user.postalCode, city: user.city, businessId: user.businessId, usernameChangedAt: user.usernameChangedAt, role: user.role, newsletterOptIn: user.newsletterOptIn } });
    }
    catch (e) {
        if (e.code === 'P2002')
            return res.status(400).json({ error: 'Sähköposti tai käyttäjänimi on jo käytössä' });
        res.status(500).json({ error: 'Palvelinvirhe' });
    }
});
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ error: 'Väärä sähköposti tai salasana' });
        const ok = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!ok)
            return res.status(401).json({ error: 'Väärä sähköposti tai salasana' });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, username: user.username, bio: user.bio, avatarUrl: user.avatarUrl, phone: user.phone, address: user.address, postalCode: user.postalCode, city: user.city, businessId: user.businessId, usernameChangedAt: user.usernameChangedAt, role: user.role, newsletterOptIn: user.newsletterOptIn } });
    }
    catch {
        res.status(500).json({ error: 'Palvelinvirhe' });
    }
});
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Sähköposti vaaditaan' });
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        // Vastaus on aina sama riippumatta löytyikö käyttäjä — ei paljasteta mitkä sähköpostit
        // ovat rekisteröityneet (estää tilien luettelointihyökkäyksen).
        if (user) {
            await (0, passwordReset_1.createAndSendPasswordResetToken)(user);
        }
        res.json({ ok: true });
    }
    catch {
        res.status(500).json({ error: 'Palvelinvirhe' });
    }
});
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password)
        return res.status(400).json({ error: 'Puuttuvia kenttiä' });
    if (password.length < 8)
        return res.status(400).json({ error: 'Salasanan on oltava vähintään 8 merkkiä' });
    try {
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const record = await prisma_1.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Linkki on vanhentunut tai jo käytetty' });
        }
        const hash = await bcrypt_1.default.hash(password, 12);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: hash } }),
            prisma_1.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        ]);
        res.json({ ok: true });
    }
    catch {
        res.status(500).json({ error: 'Palvelinvirhe' });
    }
});
exports.default = router;
