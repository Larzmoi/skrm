"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const notify_1 = require("../lib/notify");
const router = (0, express_1.Router)();
const userSelect = { id: true, name: true, username: true, avatarUrl: true };
// GET /messages — keskustelulista, ryhmiteltynä toisen osapuolen mukaan
router.get('/', auth_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const messages = await prisma_1.prisma.message.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: userSelect }, receiver: { select: userSelect } },
    });
    const conversations = new Map();
    for (const m of messages) {
        const other = m.senderId === userId ? m.receiver : m.sender;
        if (!conversations.has(other.id)) {
            conversations.set(other.id, { user: other, lastMessage: m, unreadCount: 0 });
        }
        if (m.receiverId === userId && !m.read)
            conversations.get(other.id).unreadCount++;
    }
    res.json(Array.from(conversations.values()));
});
// GET /messages/:userId — yksittäinen keskustelu, merkitsee vastaanotetut luetuksi
router.get('/:userId', auth_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const otherId = String(req.params.userId);
    const messages = await prisma_1.prisma.message.findMany({
        where: {
            OR: [
                { senderId: userId, receiverId: otherId },
                { senderId: otherId, receiverId: userId },
            ],
        },
        orderBy: { createdAt: 'asc' },
        include: { product: { select: { id: true, name: true, imageUrl: true } } },
    });
    await prisma_1.prisma.message.updateMany({ where: { senderId: otherId, receiverId: userId, read: false }, data: { read: true } });
    res.json(messages);
});
// POST /messages — lähetä viesti
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const senderId = req.userId;
    const { receiverId, body, productId } = req.body;
    if (!receiverId || !String(body ?? '').trim())
        return res.status(400).json({ error: 'receiverId ja body vaaditaan' });
    if (String(receiverId) === senderId)
        return res.status(400).json({ error: 'Et voi lähettää viestiä itsellesi' });
    const receiver = await prisma_1.prisma.user.findUnique({ where: { id: String(receiverId) } });
    if (!receiver)
        return res.status(404).json({ error: 'Käyttäjää ei löydy' });
    const message = await prisma_1.prisma.message.create({
        data: {
            senderId,
            receiverId: String(receiverId),
            body: String(body).trim().slice(0, 2000),
            productId: productId ? String(productId) : null,
        },
        include: { sender: { select: userSelect } },
    });
    (0, notify_1.emitToUser)(String(receiverId), 'message', message);
    await (0, notify_1.notifyUser)(String(receiverId), 'MESSAGE', `Uusi viesti käyttäjältä ${message.sender.name}`, message.body.slice(0, 100), `/viestit/${message.sender.username}`);
    res.status(201).json(message);
});
// POST /messages/:id/read — merkitse yksittäinen viesti luetuksi
router.post('/:id/read', auth_1.authMiddleware, async (req, res) => {
    const message = await prisma_1.prisma.message.findUnique({ where: { id: String(req.params.id) } });
    if (!message || message.receiverId !== req.userId)
        return res.status(403).json({ error: 'Ei oikeutta' });
    await prisma_1.prisma.message.update({ where: { id: message.id }, data: { read: true } });
    res.json({ ok: true });
});
exports.default = router;
