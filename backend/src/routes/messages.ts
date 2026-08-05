import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { notifyUser, emitToUser } from '../lib/notify'

const router = Router()

const userSelect = { id: true, name: true, username: true, avatarUrl: true }

// GET /messages — keskustelulista, ryhmiteltynä toisen osapuolen mukaan
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: userSelect }, receiver: { select: userSelect } },
  })

  const conversations = new Map<string, { user: typeof messages[number]['sender']; lastMessage: typeof messages[number]; unreadCount: number }>()
  for (const m of messages) {
    const other = m.senderId === userId ? m.receiver : m.sender
    if (!conversations.has(other.id)) {
      conversations.set(other.id, { user: other, lastMessage: m, unreadCount: 0 })
    }
    if (m.receiverId === userId && !m.read) conversations.get(other.id)!.unreadCount++
  }

  res.json(Array.from(conversations.values()))
})

// GET /messages/:userId — yksittäinen keskustelu, merkitsee vastaanotetut luetuksi
router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!
  const otherId = String(req.params.userId)

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: { product: { select: { id: true, name: true, imageUrl: true } } },
  })

  await prisma.message.updateMany({ where: { senderId: otherId, receiverId: userId, read: false }, data: { read: true } })

  res.json(messages)
})

// POST /messages — lähetä viesti
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const senderId = req.userId!
  const { receiverId, body, productId } = req.body
  if (!receiverId || !String(body ?? '').trim()) return res.status(400).json({ error: 'receiverId ja body vaaditaan' })
  if (String(receiverId) === senderId) return res.status(400).json({ error: 'Et voi lähettää viestiä itsellesi' })

  const receiver = await prisma.user.findUnique({ where: { id: String(receiverId) } })
  if (!receiver) return res.status(404).json({ error: 'Käyttäjää ei löydy' })

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId: String(receiverId),
      body: String(body).trim().slice(0, 2000),
      productId: productId ? String(productId) : null,
    },
    include: { sender: { select: userSelect } },
  })

  emitToUser(String(receiverId), 'message', message)
  await notifyUser(String(receiverId), 'MESSAGE', `Uusi viesti käyttäjältä ${message.sender.name}`, message.body.slice(0, 100), `/viestit/${message.sender.username}`)

  res.status(201).json(message)
})

// POST /messages/:id/read — merkitse yksittäinen viesti luetuksi
router.post('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  const message = await prisma.message.findUnique({ where: { id: String(req.params.id) } })
  if (!message || message.receiverId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  await prisma.message.update({ where: { id: message.id }, data: { read: true } })
  res.json({ ok: true })
})

export default router
