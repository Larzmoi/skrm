import { IngressClient, RoomServiceClient, AccessToken, WebhookReceiver } from 'livekit-server-sdk'
import { IngressInput } from '@livekit/protocol'
import { prisma } from '../db/prisma'

// LiveKit-migraatio 2026-08-09 (ks. CLAUDE.md "PÄÄTÖS 2026-08-09: Vaihto MediaMTX -> LiveKit").
// LIVEKIT_URL on sisäinen (palvelin-SDK, ei julkinen), LIVEKIT_WS_URL on se mitä selain käyttää.
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'http://127.0.0.1:7880'
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL || 'wss://stream.skrm.fi'
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!

export const RTMP_URL = process.env.RTMP_URL || 'rtmp://stream.skrm.fi/x'
export const LIVEKIT_WS_URL_PUBLIC = LIVEKIT_WS_URL

const ingressClient = new IngressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
export const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
export const webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

// Huone on kiinteä per myyjä ("seller-{userId}"), ei per Show — sama periaate kuin vanha
// pysyvä User.streamKey: OBS konfiguroidaan kerran, toimii kaikissa tulevissa lähetyksissä.
// Mikä Show on juuri nyt aktiivinen ratkaistaan edelleen samalla logiikalla kuin ennen
// (myyjän SCHEDULED/LIVE-lähetys), webhookin laukaisemana ingress_started/ingress_ended-
// tapahtumista MediaMTX:n runOnAvailable/runOnUnavailable-shell-hookien sijaan.
export function roomNameForSeller(userId: string) {
  return `seller-${userId}`
}

export function sellerIdFromRoomName(roomName: string): string | null {
  return roomName.startsWith('seller-') ? roomName.slice('seller-'.length) : null
}

async function createSellerIngress(userId: string) {
  const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, {
    name: `seller-${userId}`,
    roomName: roomNameForSeller(userId),
    participantIdentity: userId,
    participantName: 'Myyjä',
  })
  await prisma.user.update({
    where: { id: userId },
    data: { streamKey: ingress.streamKey, livekitIngressId: ingress.ingressId },
  })
  return ingress.streamKey!
}

// Hakee myyjän pysyvän stream keyn, luo Ingressin lazily jos puuttuu.
export async function getOrCreateStreamKey(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { streamKey: true, livekitIngressId: true } })
  if (user?.streamKey && user.livekitIngressId) return user.streamKey
  return createSellerIngress(userId)
}

// Mitätöi vanhan Ingressin (jos on) ja luo uuden — vanha avain lakkaa toimimasta heti.
export async function regenerateStreamKey(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { livekitIngressId: true } })
  if (user?.livekitIngressId) {
    try { await ingressClient.deleteIngress(user.livekitIngressId) } catch {}
  }
  return createSellerIngress(userId)
}

// Katsojan/myyjän esikatselun liittymistoken — vain kuuntelu, ei julkaisuoikeutta (myyjä
// julkaisee OBS:n kautta Ingressin välityksellä, ei suoraan selaimesta).
export async function createViewerToken(roomName: string, identity: string, name: string): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity, name, ttl: '6h' })
  at.addGrant({ roomJoin: true, room: roomName, canSubscribe: true, canPublish: false, canPublishData: false })
  return at.toJwt()
}
