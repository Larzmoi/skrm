import { Server } from 'socket.io'
import { NotificationType } from '@prisma/client'
import { prisma } from '../db/prisma'

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

export async function notifyUser(userId: string, type: NotificationType, title: string, body: string, link?: string) {
  const notification = await prisma.notification.create({ data: { userId, type, title, body, link } })
  emitToUser(userId, 'notification', notification)
  return notification
}
