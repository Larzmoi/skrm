import crypto from 'crypto'
import { prisma } from '../db/prisma'

export const RTMP_URL = process.env.RTMP_URL || 'rtmp://stream.skrm.fi/live'
export const HLS_BASE_URL = process.env.HLS_BASE_URL || 'https://stream.skrm.fi/hls'

export function hlsUrlFor(streamKey: string) {
  return `${HLS_BASE_URL}/${streamKey}.m3u8`
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
