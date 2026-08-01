import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import * as dotenv from 'dotenv'
import authRouter from './routes/auth'
import productsRouter from './routes/products'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
})

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))

app.use('/auth', authRouter)
app.use('/products', productsRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

io.on('connection', (socket) => {
  console.log('Yhdistyi:', socket.id)
  socket.on('disconnect', () => console.log('Poistui:', socket.id))
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => console.log(`SKRM backend käynnissä portilla ${PORT}`))
