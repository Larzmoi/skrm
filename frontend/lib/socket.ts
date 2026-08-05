import { io, Socket } from 'socket.io-client'
import { BACKEND_URL as BACKEND } from './backend'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND, {
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(): Socket {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect()
}
