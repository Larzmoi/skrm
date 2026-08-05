import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import * as dotenv from 'dotenv'
import authRouter from './routes/auth'
import productsRouter from './routes/products'
import showsRouter from './routes/shows'
import usersRouter from './routes/users'
import cartRouter from './routes/cart'
import ordersRouter from './routes/orders'
import webhooksRouter, { checkExpiredPayments } from './routes/webhooks'
import notificationsRouter from './routes/notifications'
import messagesRouter from './routes/messages'
import auctionsRouter from './routes/auctions'
import { setupSocket } from './socket'
import { setSocketServer } from './lib/notify'
import { checkDeliveryTimeline } from './jobs/deliveryTimeline'
import { closeExpiredAuctions } from './jobs/closeAuctions'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true } // salli kaikki originit kehityksessä
})

app.use(cors({
  origin: true, // salli kaikki originit kehityksessä
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

app.use('/auth', authRouter)
app.use('/products', productsRouter)
app.use('/shows', showsRouter)
app.use('/users', usersRouter)
app.use('/cart', cartRouter)
app.use('/orders', ordersRouter)
app.use('/webhooks', webhooksRouter)
app.use('/notifications', notificationsRouter)
app.use('/messages', messagesRouter)
app.use('/auctions', auctionsRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

setSocketServer(io)
setupSocket(io)

// Tuotannossa tämä ajetaan ulkoisella cronilla (POST /webhooks/payment-expired).
// Kehityksessä/ilman erillistä cron-palvelua ajetaan sama tarkistus 5min välein täällä.
setInterval(() => {
  checkExpiredPayments().catch(e => console.error('checkExpiredPayments virhe:', e))
}, 5 * 60 * 1000)

// Toimitusaikataulun tarkistus (5/10/14pv ilmoitukset) — kerran tunnissa riittää "kerran päivässä tai useammin" -vaatimukseen
setInterval(() => {
  checkDeliveryTimeline().catch(e => console.error('checkDeliveryTimeline virhe:', e))
}, 60 * 60 * 1000)

// Perinteisten huutokauppojen sulkeminen — minuutin välein tarkkuuden vuoksi
setInterval(() => {
  closeExpiredAuctions().catch(e => console.error('closeExpiredAuctions virhe:', e))
}, 60 * 1000)

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => console.log(`SKRM backend käynnissä portilla ${PORT}`))
