import crypto from 'crypto'
import { prisma } from '../db/prisma'

export const RTMP_URL = process.env.RTMP_URL || 'rtmp://stream.skrm.fi/live'
// MediaMTX (2026-08-09 migraatio nginx-rtmp:stä, ks. CLAUDE.md "KRIITTINEN TILANNEKATSAUS")
// tarjoilee LL-HLS:n omalla URL-muodollaan /{path}/index.m3u8 - path on sama kuin RTMP-
// julkaisupolku ("live/{streamKey}"), joten HLS_BASE_URL ei enää sisällä /hls-päätettä.
export const HLS_BASE_URL = process.env.HLS_BASE_URL || 'https://stream.skrm.fi'

export function hlsUrlFor(streamKey: string) {
  return `${HLS_BASE_URL}/live/${streamKey}/index.m3u8`
}

// Hakee käyttäjän pysyvän stream keyn, generoi sen lazily jos puuttuu (esim. ensimmäinen kerta
// kun myyjä pyytää OBS-asetuksia tai luo ensimmäisen lähetyksensä).
export async function getOrCreateStreamKey(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { streamKey: true } })
  if (user?.streamKey) return user.streamKey

  const streamKey = crypto.randomBytes(16).toString('hex')
  const updated = await prisma.user.update({ where: { id: userId }, data: { streamKey } })
  return updated.streamKey!
}

export async function regenerateStreamKey(userId: string): Promise<string> {
  const streamKey = crypto.randomBytes(16).toString('hex')
  const updated = await prisma.user.update({ where: { id: userId }, data: { streamKey } })
  return updated.streamKey!
}
