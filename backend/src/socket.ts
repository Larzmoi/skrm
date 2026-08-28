import { Server, Socket } from 'socket.io'
import { prisma } from './db/prisma'
import jwt from 'jsonwebtoken'
import { notifyUser } from './lib/notify'
import { createOrderForAuctionWin } from './lib/auctionOrder'

// Ostaja aktiivisesti läsnä livessä huutaessaan — normaali 2h maksuaika, ei perinteisen
// huutokaupan passiivisen voiton 24h (ks. CLAUDE.md maksuaika-poikkeus).
const LIVE_AUCTION_PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000

// Merkitsee live-huutokaupan tuotteen myydyksi, luo Order-rivin voittajalle ja ilmoittaa -
// sama createOrderForAuctionWin-logiikka jota closeAuctions.ts ja auctions.ts:n buy-now jo
// käyttävät, mutta tämän tiedoston oma live-huutojärjestelmä ei koskaan kutsunut sitä.
// Löytyi 2026-08-12: myyty live-tuote ei koskaan luonut ostajalle mitään maksettavaa,
// "✓ Myyty" -painallus (stop_auction) ei tehnyt tuotteelle mitään ollenkaan.
async function finalizeLiveAuctionSale(sellerId: string, productId: string, price: number, winnerId: string) {
  const product = await prisma.product.update({
    where: { id: productId },
    data: { status: 'SOLD', finalPrice: price },
  })
  await createOrderForAuctionWin(winnerId, sellerId, productId, price, LIVE_AUCTION_PAYMENT_WINDOW_MS)
  await notifyUser(winnerId, 'ORDER_WON', 'Voitit huudon!', `Voitit tuotteen "${product.name}" hintaan ${price}€. Sinulla on 2h aikaa maksaa.`, '/ostot')
}

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

// Kertoo onko tuote juuri nyt käynnissä olevan live-huutokaupan aktiivinen lot - products.ts:n
// POST /:id/prebid käyttää tätä sallimaan ennakkotarjoukset myös LIVE-lähetyksen aikana jonossa
// oleville tuotteille (ei enää vain ennen lähetyksen alkua), paitsi juuri sillä hetkellä
// huudettavana olevalle tuotteelle - sen huuto pitää mennä normaalin socket-huutojärjestelmän
// kautta (place_bid), ei tämän REST-reitin, koska vain socket pitää auction.currentBid:in
// reaaliaikaisesti oikeana koko kutsujoukolle. Sama prosessi (socket.ts + products.ts ajavat
// samassa Node-prosessissa), joten in-memory-Map on suoraan luettavissa tänne.
export function isActiveLiveLot(showId: string, productId: string): boolean {
  const state = auctions.get(showId)
  return !!state?.active && state.productId === productId
}

// Kuunneltujen showien setti per socket — tarvitaan jotta disconnect-tapahtumassa tiedetään
// mistä huoneista katsojamäärä pitää päivittää (socket.rooms on jo tyhjä disconnect-käsittelijässä)
const socketShows = new Map<string, Set<string>>()

// Myyjän mykistämät käyttäjät per show — kevyt in-memory-lista, ei vaadi tietokantamallia
// (chat itsessään ei ole pysyvä, joten mykistyskään ei tarvitse olla)
const mutedUsers = new Map<string, Set<string>>()

// Chat & moderointi -laajennus (ks. CLAUDE.md "2. Chat & moderointi") — kaikki in-memory,
// samalla periaatteella kuin mutedUsers: sidottu yhteen liveen, ei pysyvä tietokantamalli.
const moderators = new Map<string, Set<string>>()          // showId -> moderaattorien userId:t
const removedFromShow = new Map<string, Set<string>>()     // showId -> tästä livestä poistettujen userId:t (EI sivustolaajuinen banni)
const mutedWords = new Map<string, string[]>()             // showId -> myyjän kieltämät sanat (pieninä kirjaimina)
const viewerIdentities = new Map<string, Map<string, { userId: string; username: string }>>() // showId -> socketId -> katsojan identiteetti (Watching-lista varten)

function isSellerOrMod(showId: string, sellerId: string | undefined, userId: string) {
  if (sellerId && sellerId === userId) return true
  return moderators.get(showId)?.has(userId) ?? false
}

// mutedWords-Map on vain nopea in-memory-välimuisti - lähde totuudelle on Show.mutedWords
// tietokannassa, koska Map tyhjenee jokaisella backend-uudelleenkäynnistyksellä (deploy),
// jolloin myyjän asettama suodatin katosi hiljaisesti ilman tätä (ks. CLAUDE.md "Uudet
// löydökset 2026-08-13" kohta 2 - suodatin toimi loogisesti oikein, mutta ei säilynyt).
async function getMutedWords(showId: string): Promise<string[]> {
  const cached = mutedWords.get(showId)
  if (cached) return cached
  const show = await prisma.show.findUnique({ where: { id: showId }, select: { mutedWords: true } })
  const words = show?.mutedWords ?? []
  mutedWords.set(showId, words)
  return words
}

function containsMutedWord(words: string[], message: string) {
  if (!words || words.length === 0) return false
  const lower = message.toLowerCase()
  return words.some(w => w && lower.includes(w))
}

function broadcastViewerCount(io: Server, showId: string) {
  const room = io.sockets.adapter.rooms.get(`show:${showId}`)
  io.to(`show:${showId}`).emit('viewer_count', { count: room?.size ?? 0 })
}

// Watching-lista: kirjautuneet katsojat joiden identiteetti tunnetaan (join_show:n mukana tullut token) —
// anonyymit/kirjautumattomat katsojat lasketaan viewer_countiin mutta eivät näy nimellä listassa.
function broadcastViewerList(io: Server, showId: string, sellerId: string | undefined) {
  const identities = viewerIdentities.get(showId)
  const list = identities
    ? Array.from(new Map(Array.from(identities.values()).map(v => [v.userId, v])).values()).map(v => ({
        userId: v.userId,
        username: v.username,
        isSeller: v.userId === sellerId,
        isModerator: moderators.get(showId)?.has(v.userId) ?? false,
      }))
    : []
  io.to(`show:${showId}`).emit('viewer_list', { viewers: list })
}

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Socket yhdistyi:', socket.id)

    // Liity omaan käyttäjähuoneeseen (ilmoitukset, viestit)
    socket.on('join_user', (userId: string) => {
      socket.join(`user:${userId}`)
    })

    // Liity lähetyshuoneeseen. Hyväksyy joko pelkän showId-merkkijonon (anonyymi/kirjautumaton
    // katsoja) tai { showId, token }:n (kirjautunut katsoja — identiteetti näkyy Watching-listassa,
    // ja "poistettu livestä" -esto voidaan tarkistaa).
    socket.on('join_show', async (payload: string | { showId: string; token?: string }) => {
      const showId = typeof payload === 'string' ? payload : payload.showId
      const token = typeof payload === 'object' ? payload.token : undefined

      let userId: string | undefined
      let username: string | undefined
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
          const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, username: true } })
          if (user) { userId = user.id; username = user.username }
        } catch {}
      }

      const show = await prisma.show.findUnique({ where: { id: showId }, select: { sellerId: true } })

      if (userId && removedFromShow.get(showId)?.has(userId)) {
        socket.emit('join_rejected', { reason: 'removed' })
        return
      }

      socket.join(`show:${showId}`)
      if (!socketShows.has(socket.id)) socketShows.set(socket.id, new Set())
      socketShows.get(socket.id)!.add(showId)

      if (userId && username) {
        if (!viewerIdentities.has(showId)) viewerIdentities.set(showId, new Map())
        viewerIdentities.get(showId)!.set(socket.id, { userId, username })
        socket.emit('your_status', { isSeller: show?.sellerId === userId, isModerator: moderators.get(showId)?.has(userId) ?? false })
      }

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
      broadcastViewerCount(io, showId)
      broadcastViewerList(io, showId, show?.sellerId)
    })

    // Poistu huoneesta
    socket.on('leave_show', (showId: string) => {
      socket.leave(`show:${showId}`)
      socketShows.get(socket.id)?.delete(showId)
      viewerIdentities.get(showId)?.delete(socket.id)
      broadcastViewerCount(io, showId)
      prisma.show.findUnique({ where: { id: showId }, select: { sellerId: true } }).then(show => {
        broadcastViewerList(io, showId, show?.sellerId)
      }).catch(() => {})
    })

    // Chat-viesti
    socket.on('chat_message', async ({ showId, message, token }: { showId: string; message: string; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        if (mutedUsers.get(showId)?.has(decoded.userId)) return
        if (removedFromShow.get(showId)?.has(decoded.userId)) return
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, username: true },
        })
        if (!user || !message.trim()) return
        const trimmed = message.trim().slice(0, 200)
        const words = await getMutedWords(showId)
        io.to(`show:${showId}`).emit('chat_message', {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: user.id,
          username: user.username,
          message: trimmed,
          hidden: containsMutedWord(words, trimmed),
          timestamp: Date.now(),
        })
      } catch {}
    })

    // Myyjä/moderaattori poistaa chat-viestin kaikkien näkyvistä (viesti itsessään ei ole pysyvä, joten "poisto" on puhtaasti broadcast-tason toiminto)
    socket.on('delete_chat_message', async ({ showId, messageId, token }: { showId: string; messageId: string; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || !isSellerOrMod(showId, show.sellerId, decoded.userId)) return
        io.to(`show:${showId}`).emit('chat_message_deleted', { messageId })
      } catch {}
    })

    // Myyjä/moderaattori mykistää käyttäjän kyseisessä lähetyksessä (ei koko sivuston laajuinen banni — eri asia)
    socket.on('mute_user', async ({ showId, userId, token }: { showId: string; userId: string; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || !isSellerOrMod(showId, show.sellerId, decoded.userId)) return
        if (!mutedUsers.has(showId)) mutedUsers.set(showId, new Set())
        mutedUsers.get(showId)!.add(userId)
        io.to(`show:${showId}`).emit('user_muted', { userId })
      } catch {}
    })

    // Myyjä tekee käyttäjästä moderaattorin tähän liveen (ei sivustonlaajuinen rooli)
    socket.on('assign_moderator', async ({ showId, userId, token }: { showId: string; userId: string; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || show.sellerId !== decoded.userId) return
        if (!moderators.has(showId)) moderators.set(showId, new Set())
        moderators.get(showId)!.add(userId)
        io.to(`show:${showId}`).emit('moderator_status', { userId, isModerator: true })
        broadcastViewerList(io, showId, show.sellerId)
      } catch {}
    })

    // Myyjä poistaa moderaattorin oikeudet
    socket.on('remove_moderator', async ({ showId, userId, token }: { showId: string; userId: string; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || show.sellerId !== decoded.userId) return
        moderators.get(showId)?.delete(userId)
        io.to(`show:${showId}`).emit('moderator_status', { userId, isModerator: false })
        broadcastViewerList(io, showId, show.sellerId)
      } catch {}
    })

    // Myyjä/moderaattori poistaa käyttäjän TÄSTÄ livestä — eri asia kuin sivustonlaajuinen Ban-malli.
    // Poistettu ei voi enää chatata/huutaa/liittyä takaisin tähän samaan liveen, mutta voi käyttää
    // sivustoa muuten normaalisti ja osallistua muihin livestreameihin.
    socket.on('remove_from_show', async ({ showId, userId, token }: { showId: string; userId: string; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || !isSellerOrMod(showId, show.sellerId, decoded.userId)) return
        if (!removedFromShow.has(showId)) removedFromShow.set(showId, new Set())
        removedFromShow.get(showId)!.add(userId)
        io.to(`show:${showId}`).emit('user_removed_from_show', { userId })
      } catch {}
    })

    // Myyjä asettaa/päivittää kielletyt sanat tälle livelle — viestit joissa niitä esiintyy
    // piilotetaan normaalilta yleisöltä (hidden:true), mutta myyjä/moderaattorit näkevät ne yhä
    socket.on('set_muted_words', async ({ showId, words, token }: { showId: string; words: string[]; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || show.sellerId !== decoded.userId) return
        const cleaned = (words ?? []).map(w => String(w).trim().toLowerCase()).filter(Boolean).slice(0, 100)
        mutedWords.set(showId, cleaned)
        await prisma.show.update({ where: { id: showId }, data: { mutedWords: cleaned } })
        socket.emit('muted_words_saved', { words: cleaned })
      } catch {}
    })

    // Myyjä pidentää käynnissä olevan huudon aikaa (+10s pikatoiminto)
    socket.on('extend_timer', async ({ showId, seconds, token }: { showId: string; seconds: number; token: string }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const show = await prisma.show.findUnique({ where: { id: showId } })
        if (!show || show.sellerId !== decoded.userId) return
        const state = auctions.get(showId)
        if (!state || !state.active) return
        state.timer += Number(seconds) || 10
        io.to(`show:${showId}`).emit('timer_tick', { timer: state.timer, productId: state.productId })
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

        // Ennakkotarjoukset (ks. POST /products/:id/prebid, CLAUDE.md "Live-ominaisuudet
        // Whatnot-tasolle" kohta 1): jos tuotteelle on jo tehty korkeampia tarjouksia ennen
        // kuin lähetys meni julkiseksi, Product.currentBid/currentBidderId sisältää jo ne -
        // jatketaan siitä sen sijaan että aloitettaisiin puhtaalta pöydältä lähtöhinnasta,
        // muuten ensimmäinen ennakkotarjoaja "häviäisi" tarjouksensa huomaamattaan.
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { currentBid: true, currentBidderId: true },
        })
        let leaderId: string | null = null
        let leaderName: string | null = null
        let initialBid = Number(startPrice)
        if (product?.currentBid != null && product.currentBidderId && product.currentBid >= initialBid) {
          initialBid = product.currentBid
          leaderId = product.currentBidderId
          const leader = await prisma.user.findUnique({ where: { id: product.currentBidderId }, select: { username: true } })
          leaderName = leader?.username ?? null
        }

        const state: AuctionState = {
          productId,
          currentBid: initialBid,
          leaderId,
          leaderName,
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
            if (state.leaderId) {
              finalizeLiveAuctionSale(show.sellerId, productId, state.currentBid, state.leaderId).catch(console.error)
            }
          }
        }, 1000)

        auctions.set(showId, state)

        io.to(`show:${showId}`).emit('auction_started', {
          productId,
          startPrice: state.currentBid,
          duration: Number(duration) || 120,
          leaderId: state.leaderId,
          leaderName: state.leaderName,
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
        if (removedFromShow.get(showId)?.has(decoded.userId)) {
          socket.emit('bid_error', { message: 'Sinut on poistettu tästä lähetyksestä' })
          return
        }
        const state = auctions.get(showId)

        if (!state || !state.active || state.productId !== productId) {
          socket.emit('bid_error', { message: 'Huutokauppa ei ole aktiivinen' })
          return
        }
        if (amount <= state.currentBid) {
          socket.emit('bid_error', { message: `Huudon täytyy olla yli ${state.currentBid}€` })
          return
        }

        // Myyjä ei voi huutaa omaan tuotteeseensa (keinotekoisen hinnannoston esto) - tarkistettava
        // täällä backendissä, frontendin piilotus ei riitä koska sen voi ohittaa suoraan socketilla.
        // product+user haetaan rinnakkain (ei peräkkäin) - ks. CLAUDE.md "Uudet löydökset
        // 2026-08-13" kohta 10, huutoilmoituksen viive tuntui hitaalta.
        const [product, user] = await Promise.all([
          prisma.product.findUnique({ where: { id: productId }, select: { sellerId: true } }),
          prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, username: true } }),
        ])
        if (!product || !user) return
        if (product.sellerId === decoded.userId) {
          socket.emit('bid_error', { message: 'Et voi huutaa omaan tuotteeseesi' })
          return
        }

        // Päivitä tila ja ilmoita huutajille HETI - ei odoteta Bid-rivin DB-kirjoitusta ensin.
        // In-memory state on jo livelle totuus (sama periaate kuin muuallakin tässä
        // tiedostossa), DB on pysyvä kirjanpito eikä sen tarvitse valmistua ennen kuin
        // huutaja näkee vahvistuksen - tämä oli suurin yksittäinen viiveen lähde.
        state.currentBid = amount
        state.leaderId = user.id
        state.leaderName = user.username

        // Antisnipe: +10s vain jos 10s tai vähemmän jäljellä
        if (state.timer <= 10) state.timer += 10

        io.to(`show:${showId}`).emit('new_bid', {
          productId,
          amount,
          userId: user.id,
          username: user.username,
          timer: state.timer,
        })

        socket.emit('bid_accepted', { amount, productId })

        prisma.bid.create({ data: { productId, showId, userId: user.id, amount } })
          .catch(e => console.error('Huudon tallennus epäonnistui:', e))
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

        // "✓ Myyty" -painallus - sama Order-luonti kuin ajastimen loppumisella, ks.
        // finalizeLiveAuctionSale. Ilman tätä myyty tuote ei koskaan luonut mitään
        // ostajalle maksettavaa, koska tämä on todellisuudessa yleisin tapa päättää
        // live-huutokauppa (myyjä päättää itse, ei odota ajastinta loppuun).
        if (state?.leaderId && state.productId) {
          finalizeLiveAuctionSale(show.sellerId, state.productId, state.currentBid, state.leaderId).catch(console.error)
        }
      } catch {}
    })

    socket.on('disconnect', () => {
      console.log('Socket poistui:', socket.id)
      const shows = socketShows.get(socket.id)
      socketShows.delete(socket.id)
      if (shows) {
        // socket on jo poistunut huoneista tässä vaiheessa — laske koko ilman sitä
        for (const showId of shows) {
          viewerIdentities.get(showId)?.delete(socket.id)
          broadcastViewerCount(io, showId)
          prisma.show.findUnique({ where: { id: showId }, select: { sellerId: true } }).then(show => {
            broadcastViewerList(io, showId, show?.sellerId)
          }).catch(() => {})
        }
      }
    })
  })
}
