import { io, Socket } from 'socket.io-client'
import { BACKEND_URL as BACKEND } from './backend'

let socket: Socket | null = null

// socket.io-client tulkitsee io()-kutsulle annetun URL:in polkuosan NIMIAVARUUDEKSI, ei reittiin
// välitettäväksi prefiksiksi — jos BACKEND_URL sisältää polun (esim. tuotannossa
// "https://app.skrm.fi/api", koska nginx reitittää vain /api/-alkuiset pyynnöt backendille),
// pelkkä io(BACKEND) yhdistäisi vääriin osoitteeseen ("/socket.io/" eikä "/api/socket.io/") eikä
// koskaan onnistuisi — koko socket-yhteys (chat, huudot, katsojamäärä) jäisi hiljaisesti muodostumatta.
// Siksi origin ja polku erotellaan eksplisiittisesti "path"-optiolla.
function parseBackend() {
  try {
    const u = new URL(BACKEND)
    const base = u.pathname.replace(/\/+$/, '')
    return { origin: u.origin, path: `${base}/socket.io/` }
  } catch {
    return { origin: BACKEND, path: '/socket.io/' }
  }
}

export function getSocket(): Socket {
  if (!socket) {
    const { origin, path } = parseBackend()
    socket = io(origin, {
      path,
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
