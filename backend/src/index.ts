import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
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
import reportsRouter from './routes/reports'
import adminRouter from './routes/admin'
import pushRouter from './routes/push'
import presetsRouter from './routes/presets'
import postiRouter from './routes/posti'
import adRouter from './routes/ad'
import offersRouter from './routes/offers'
import { setupSocket } from './socket'
import { setSocketServer } from './lib/notify'
import { checkDeliveryTimeline } from './jobs/deliveryTimeline'
import { closeExpiredAuctions } from './jobs/closeAuctions'
import { checkExpiredOffers } from './jobs/expireOffers'

dotenv.config()

const app = express()
// Tuotannossa Cloudflare -> nginx (localhost proxy_pass) -> tämä sovellus. Ilman tätä
// req.ip olisi AINA nginxin oma osoite (127.0.0.1) jokaisella pyynnöllä, jolloin alla oleva
// rate limiting laskisi KAIKKI käyttäjät yhteen ainoaan "IP:hen" - yksi ainoa ämpäri koko
// sivustolle 100 pyynnön/15min sisällä riippumatta kuinka moni oikea kävijä sivustolla on.
// "1" = luota täsmälleen yhteen väliin jäävään proxyyn (nginx), jolloin req.ip resolvoituu
// nginxin X-Forwarded-For-otsikon oikeasta, alkuperäisestä asiakas-IP:stä.
app.set('trust proxy', 1)
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true }, // salli kaikki originit kehityksessä
  // Oletus (pingInterval 25s + pingTimeout 20s) kestäisi jopa ~45s ennen kuin palvelin
  // huomaa kuolleen yhteyden ja pakottaa uudelleenyhdistämisen. Osa mobiilioperaattoreista
  // suodattaa/pudottaa vain palvelin->asiakas-suunnan liikenteen NAT/middlebox-verkossaan
  // (asiakas näyttää silti "yhdistettynä" ja pystyy lähettämään, muttei koskaan vastaanota
  // mitään) — havaittu 2026-08-09 Android-puhelimella mobiilidatalla, toistui sekä Chromella
  // että Firefoxilla, ei toistunut WiFillä/tietokoneella. Tiukempi ping-aikaraja saa
  // socket.io:n huomaamaan ja korjaamaan tämän nopeammin sen sijaan että katsoja jäisi
  // "yhdistettynä mutta mykkänä" -tilaan pitkäksi aikaa.
  pingInterval: 10000,
  pingTimeout: 8000,
})

app.use(cors({
  origin: true, // salli kaikki originit kehityksessä
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// Rate limiting — CodeQL löysi 64 "Missing rate limiting" -varoitusta backend-reiteiltä
// (ks. CLAUDE.md "Rate limiting puuttuu kokonaan"). Kaksi tasoa: yleinen raja koko API:lle
// (nginx poistaa /api/-etuliitteen ennen tätä sovellusta, joten tämä KOSKEE koko julkista
// API:a vaikka polut eivät ala /api:lla täällä) + tiukempi raja login/register/forgot-
// password-reiteille erikseen, koska 100/15min yksin sallisi silti kymmeniä/satoja
// bruteforce-yrityksiä ennen rajoittumista.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Liian monta pyyntöä, yritä myöhemmin uudelleen' },
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Liian monta yritystä, yritä myöhemmin uudelleen' },
})
app.use(globalLimiter)
app.use('/auth/login', authLimiter)
app.use('/auth/register', authLimiter)
app.use('/auth/forgot-password', authLimiter)

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
app.use('/reports', reportsRouter)
app.use('/admin', adminRouter)
app.use('/push', pushRouter)
app.use('/presets', presetsRouter)
app.use('/posti', postiRouter)
app.use('/ad', adRouter)
app.use('/offers', offersRouter)

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

// Tarjousten (Offer) 48h-vanheneminen — kerran tunnissa riittää, sama periaate kuin deliveryTimeline
setInterval(() => {
  checkExpiredOffers().catch(e => console.error('checkExpiredOffers virhe:', e))
}, 60 * 60 * 1000)

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => console.log(`SKRM backend käynnissä portilla ${PORT}`))
