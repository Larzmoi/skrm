import { Server, Socket } from 'socket.io'
import { prisma } from './db/prisma'
import jwt from 'jsonwebtoken'
import { notifyUser } from './lib/notify'

interface BidPayload {
  showId: string
  productId: string
  amount: number
  token: string
}

interface AuctionState {
  productId: string
  currentBid: number
  leaderId: string | null
  leaderName: string | null
  timer: number
  active: boolean
  interval?: ReturnType<typeof setInterval>
}

const auctions = new Map<string, AuctionState>()

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Socket yhdistyi:', socket.id)

    // Liity omaan käyttäjähuoneeseen (ilmoitukset, viestit)
    socket.on('join_user', (userId: string) => {
      socket.join(`user:${userId}`)
    })

    // Liity lähetyshuoneeseen
    socket.on('join_show', (showId: string) => {
      socket.join(`show:${showId}`)
      // Lähetä nykyinen tila jos huutokauppa käynnissä
      const state = auctions.get(showId)
      if (state) {
        socket.emit('auction_state', {
          productId: state.productId,
          currentBid: state.currentBid,
          leaderId: state.leaderId,
          leaderName: state.leaderName,
          timer: state.timer,
          active: state.active,
        })
      }
    })

    // Poistu huoneesta
    socket.on('leave_show', (showId: string) => {
      socket.leave(`show:${showId}`)
    })

    // Chat-viesti
    socket.on('chat_message', async ({ showId, message, token }: { showId: string; message: string; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, username: true },
        })
        if (!user || !message.trim()) return
        io.to(`show:${showId}`).emit('chat_message', {
          userId: user.id,
          username: user.username,
          message: message.trim().slice(0, 200),
          timestamp: Date.now(),
        })
      } catch {}
    })

    // Myyjä aloittaa huutokaupan
    socket.on('start_auction', async ({ showId, productId, startPrice, duration, token }: any) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || show.sellerId !== decoded.userId) return

        // Pysäytä edellinen huutokauppa jos käynnissä
        const existing = auctions.get(showId)
        if (existing?.interval) clearInterval(existing.interval)

        const state: AuctionState = {
          productId,
          currentBid: Number(startPrice),
          leaderId: null,
          leaderName: null,
          timer: Number(duration) || 120,
          active: true,
        }

        state.interval = setInterval(() => {
          state.timer--
          io.to(`show:${showId}`).emit('timer_tick', { timer: state.timer, productId })

          if (state.timer <= 0) {
            clearInterval(state.interval)
            state.active = false
            io.to(`show:${showId}`).emit('auction_ended', {
              productId,
              finalPrice: state.currentBid,
              winnerId: state.leaderId,
              winnerName: state.leaderName,
            })
            // Päivitä tuotteen tila
            if (state.leaderId) {
              prisma.product.update({
                where: { id: productId },
                data: { status: 'SOLD', finalPrice: state.currentBid },
              }).then(product => {
                notifyUser(state.leaderId!, 'ORDER_WON', 'Voitit huudon!', `Voitit tuotteen "${product.name}" hintaan ${state.currentBid}€`, `/tuotteet/${productId}`).catch(console.error)
              }).catch(console.error)
            }
          }
        }, 1000)

        auctions.set(showId, state)

        io.to(`show:${showId}`).emit('auction_started', {
          productId,
          startPrice: state.currentBid,
          duration: Number(duration) || 120,
        })
      } catch (e) {
        console.error('start_auction error:', e)
      }
    })

    // Huuto
    socket.on('place_bid', async (payload: BidPayload) => {
      const { showId, productId, amount, token } = payload
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const state = auctions.get(showId)

        if (!state || !state.active || state.productId !== productId) {
          socket.emit('bid_error', { message: 'Huutokauppa ei ole aktiivinen' })
          return
        }
        if (amount <= state.currentBid) {
          socket.emit('bid_error', { message: `Huudon täytyy olla yli ${state.currentBid}€` })
          return
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, username: true },
        })
        if (!user) return

        // Tallenna huuto
        await prisma.bid.create({
          data: {
            productId,
            showId,
            userId: user.id,
            amount,
          },
        })

        // Päivitä tila
        state.currentBid = amount
        state.leaderId = user.id
        state.leaderName = user.username

        // Lisää aikaa (+15s jos alle 30s jäljellä)
        if (state.timer < 30) state.timer = Math.min(state.timer + 15, 60)

        io.to(`show:${showId}`).emit('new_bid', {
          productId,
          amount,
          userId: user.id,
          username: user.username,
          timer: state.timer,
        })

        socket.emit('bid_accepted', { amount, productId })
      } catch (e) {
        socket.emit('bid_error', { message: 'Huuto epäonnistui' })
      }
    })

    // Myyjä pysäyttää huutokaupan
    socket.on('stop_auction', async ({ showId, token }: any) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || show.sellerId !== decoded.userId) return

        const state = auctions.get(showId)
        if (state?.interval) clearInterval(state.interval)
        if (state) state.active = false

        io.to(`show:${showId}`).emit('auction_ended', {
          productId: state?.productId,
          finalPrice: state?.currentBid,
          winnerId: state?.leaderId,
          winnerName: state?.leaderName,
        })
      } catch {}
    })

    socket.on('disconnect', () => {
      console.log('Socket poistui:', socket.id)
    })
  })
}
