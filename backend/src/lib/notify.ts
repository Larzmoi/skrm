import { Server } from 'socket.io'
import { NotificationType } from '@prisma/client'
import { prisma } from '../db/prisma'
import { sendPushToUser } from './push'

let io: Server | null = null

export function setSocketServer(server: Server) {
  io = server
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload)
}

export function emitToShow(showId: string, event: string, payload: unknown) {
  io?.to(`show:${showId}`).emit(event, payload)
}

// Ilmoitustyypit joille EI koskaan lähetetä puhelimen/selaimen omaa push-ilmoitusta —
// vain in-app (ks. CLAUDE.md "Push-ilmoitukset" 2026-08-17): NEW_FOLLOWER on tarkoituksella
// vain in-app, koska omistajan pyynnöstä ainoastaan "myyjä meni liveen" (SELLER_LIVE) piti
// kantautua puhelimeen asti uuden seuraajan saamisesta.
const NO_PUSH_TYPES: NotificationType[] = ['NEW_FOLLOWER']

// Keskitetty push-lähetys 2026-09-12: aiemmin vain kaksi (SELLER_LIVE, AUCTION_ENDING_SOON)
// kahdesta kolmestakymmenestä ilmoitustyypistä laukaisivat oikean käyttöjärjestelmätason
// push-ilmoituksen — loput (mm. uusi myynti, uusi viesti, tarjous, huudon ohitus) loivat vain
// in-app-Notification-rivin joka vaatii avoimen selainvälilehden näkyäkseen. Nyt notifyUser()
// lähettää pushin automaattisesti JOKAISELLE kutsupaikalle ilman että jokaiseen ~35 kutsuun
// pitäisi erikseen lisätä oma sendPushToUser()-kutsu — pienempi, keskitetympi muutos jolla ei
// voi vahingossa unohtaa yhtäkään kutsupaikkaa. Ei odoteta valmiiksi ennen notifyUser():n
// paluuta (sendPushToUser hoitaa omat virheensä sisäisesti) - sama "ei blokkaa" -periaate
// kuin push.ts:n omalla dokumentoidulla käytöksellä.
export async function notifyUser(userId: string, type: NotificationType, title: string, body: string, link?: string) {
  const notification = await prisma.notification.create({ data: { userId, type, title, body, link } })
  emitToUser(userId, 'notification', notification)
  if (!NO_PUSH_TYPES.includes(type)) {
    sendPushToUser(userId, { title, body, url: link }).catch(() => {})
  }
  return notification
}
