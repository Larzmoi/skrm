import { Router, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { RTMP_URL, getOrCreateStreamKey, roomNameForSeller, createViewerToken, LIVEKIT_WS_URL_PUBLIC } from '../lib/livekit'
import { emitToShow } from '../lib/notify'

const router = Router()

// Julkinen valinta — streamKey on salainen eikä saa koskaan päätyä julkisiin vastauksiin.
// hlsUrl on jäänne MediaMTX-ajalta (ks. CLAUDE.md "PÄÄTÖS 2026-08-09: Vaihto MediaMTX ->
// LiveKit") — LiveKitissä katsoja ei tarvitse URL:ia vaan huoneen nimen (johdettavissa
// suoraan sellerId:stä, ks. roomNameForSeller) + tuoreen tokenin (POST /shows/:id/viewer-token).
const publicShowSelect = {
  id: true, title: true, sellerId: true, status: true, category: true, alakategoria: true, city: true, thumbnailUrl: true,
  scheduledAt: true, startedAt: true, endedAt: true,
  viewerCount: true, createdAt: true,
}

// GET /shows — julkiset live ja tulevat.
// Huom: SCHEDULED-lähetys jolla ei ole scheduledAt-ajankohtaa on myyjän yksityinen esikatselu-/
// testilähetys (ks. dashboard/lähetys "Luo lähetys ja testaa yhteys" — ei koskaan aseta scheduledAt:ia),
// ei todellinen julkisesti ilmoitettu "tuleva" lähetys — sellaista ei näytetä tässä listauksessa
// ennen kuin se joko menee oikeasti LIVE:ksi tai myyjä ajastaa sille julkaisuajan.
router.get('/', async (req, res) => {
  const { status } = req.query
  const select: any = {
    ...publicShowSelect,
    seller: { select: { id: true, name: true, username: true } },
    products: { where: { status: 'PENDING' }, orderBy: { order: 'asc' }, take: 5 },
  }
  if (status) {
    const where: any = String(status) === 'SCHEDULED'
      ? { status: 'SCHEDULED', scheduledAt: { gt: new Date() } }
      : { status: String(status) }
    const shows = await prisma.show.findMany({ where, orderBy: { scheduledAt: 'asc' }, select })
    return res.json(shows)
  }
  // Live ensin, sitten tulevat ajastetut ajanjärjestyksessä. Yksi orderBy: scheduledAt:'asc'
  // olisi haudannut käynnissä olevan liven tulevien ajastettujen taakse - ad-hoc aloitettu
  // live (esim. "Luo lähetys ja testaa yhteys") ei koskaan aseta scheduledAt:ia, ja Postgresin
  // oletus ASC-järjestyksessä on NULLS LAST, joten se olisi pudonnut listan loppuun.
  // scheduledAt: { gt: now } jättää pois myös menneisyyteen jääneet ajastukset joita myyjä
  // ei koskaan aloittanut/päättänyt - eivät ole enää "tulevia", eivät kuulu tähän listaan.
  const [live, scheduled] = await Promise.all([
    prisma.show.findMany({ where: { status: 'LIVE' }, orderBy: { startedAt: 'desc' }, select }),
    prisma.show.findMany({ where: { status: 'SCHEDULED', scheduledAt: { gt: new Date() } }, orderBy: { scheduledAt: 'asc' }, select }),
  ])
  res.json([...live, ...scheduled])
})

// GET /shows/mine — omat lähetykset (kaikki statukset) — huom: ennen /:id-reittiä ettei "mine" osu :id-parametriin
router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  const shows = await prisma.show.findMany({
    where: { sellerId: req.userId! },
    orderBy: { scheduledAt: 'asc' },
    select: publicShowSelect,
  })
  res.json(shows)
})

// GET /shows/:id
router.get('/:id', async (req, res) => {
  const show = await prisma.show.findUnique({
    where: { id: String(req.params.id) },
    select: {
      ...publicShowSelect,
      seller: { select: { id: true, name: true, username: true } },
      products: { orderBy: { order: 'asc' } },
    },
  })
  if (!show) return res.status(404).json({ error: 'Lähetystä ei löydy' })
  res.json(show)
})

// POST /shows — luo lähetys. Ei enää generoi/tallenna striimi-URLia tähän riviin — LiveKitissä
// katsoja liittyy huoneeseen (johdettu sellerId:stä) tuoreella tokenilla, ei kiinteällä URL:lla.
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, category, alakategoria, city, scheduledAt, thumbnailUrl } = req.body
  if (!title) return res.status(400).json({ error: 'Nimi vaaditaan' })

  // Varmistaa että myyjän Ingress on olemassa (lazy-luonti) vaikka ei suoraan tarvita tässä.
  await getOrCreateStreamKey(req.userId!)

  const show = await prisma.show.create({
    data: {
      title,
      category: category ?? null,
      alakategoria: alakategoria ?? null,
      city: city ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      sellerId: req.userId!,
      thumbnailUrl: thumbnailUrl ?? null,
    },
  })
  res.status(201).json(show)
})

// GET /shows/:id/stream-info — hae RTMP-tiedot myyjälle (OBS-striimausta varten)
// Huom: streamKey on pysyvä ja käyttäjäkohtainen — sama kaikilla myyjän lähetyksillä.
// Ks. myös GET /users/me/stream-info, joka toimii ilman että lähetystä on vielä luotu.
router.get('/:id/stream-info', authMiddleware, async (req: AuthRequest, res: Response) => {
  const show = await prisma.show.findUnique({ where: { id: String(req.params.id) } })
  if (!show || show.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  const streamKey = await getOrCreateStreamKey(req.userId!)
  res.json({ rtmpUrl: RTMP_URL, streamKey })
})

// POST /shows/:id/viewer-token — tuore LiveKit-liittymistoken katsojalle (vain kuuntelu).
// Ei vaadi kirjautumista — katsominen on aina sallittua, vain chat/huuto vaatii tunnuksen
// (sama periaate kuin ennenkin). Kirjautumaton käyttäjä saa satunnaisen anonyymi-identiteetin.
router.post('/:id/viewer-token', async (req: AuthRequest, res: Response) => {
  const show = await prisma.show.findUnique({ where: { id: String(req.params.id) }, select: { sellerId: true, status: true } })
  if (!show) return res.status(404).json({ error: 'Lähetystä ei löydy' })

  let identity = `anon-${Math.random().toString(36).slice(2, 10)}`
  let name = 'Katsoja'
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, username: true } })
      if (user) { identity = user.id; name = user.username }
    } catch {}
  }

  const roomName = roomNameForSeller(show.sellerId)
  const viewerToken = await createViewerToken(roomName, identity, name)
  res.json({ wsUrl: LIVEKIT_WS_URL_PUBLIC, token: viewerToken, roomName })
})

// PATCH /shows/:id/status — muuta tila (LIVE/ENDED)
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const show = await prisma.show.findUnique({ where: { id: String(req.params.id) } })
  if (!show || show.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  const { status, thumbnailUrl } = req.body
  const updated = await prisma.show.update({
    where: { id: String(req.params.id) },
    data: {
      status,
      thumbnailUrl: thumbnailUrl ?? undefined,
      startedAt: status === 'LIVE' ? new Date() : undefined,
      endedAt: status === 'ENDED' ? new Date() : undefined,
    },
  })
  // Ilman tätä katsojien selaimet eivät koskaan saa tietää että myyjä lopetti manuaalisesti
  // "Lopeta"-napista - vain automaattinen webhook-pohjainen lopetus (ks. webhooks.ts) emittasi
  // tämän ennen, joten manuaalisesti lopetettu lähetys jäi katsojan ruudulle roikkumaan.
  if (status === 'LIVE' || status === 'ENDED') emitToShow(updated.id, 'show_status', { status })
  res.json(updated)
})

// DELETE /shows/:id — peruuta ajastettu lähetys (vain ennen kuin se on mennyt LIVE:ksi)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const show = await prisma.show.findUnique({ where: { id: String(req.params.id) } })
  if (!show || show.sellerId !== req.userId) return res.status(403).json({ error: 'Ei oikeutta' })
  if (show.status !== 'SCHEDULED') return res.status(400).json({ error: 'Vain ajastetun lähetyksen voi peruuttaa' })
  await prisma.show.delete({ where: { id: show.id } })
  res.json({ ok: true })
})

export default router
