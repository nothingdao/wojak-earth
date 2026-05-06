import { createServer } from 'node:http'
import express from 'express'
import { WebSocketServer } from 'ws'
import { SessionHandler } from './ws/SessionHandler.js'
import earthRouter from './earth/index.js'

const PORT = Number(process.env.PORT ?? 3001)

const app = express()
app.use(express.json({ limit: '10mb' })) // images come through as base64
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-wallet')
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
  next()
})
app.options('*path', (_req, res) => res.sendStatus(204))

app.get('/health', (_req, res) => res.json({ ok: true, service: 'nothingdao-server' }))
app.use('/earth', earthRouter)

const httpServer = createServer(app)

const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (socket) => {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const handler = new SessionHandler(socket, sessionId)
  handler.start()

  socket.on('message', (data) => handler.handle(data.toString()))
  socket.on('close', () => handler.stop())
  socket.on('error', (error) => {
    console.error('WebSocket session error:', error)
    handler.stop()
  })
})

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (HTTP + WS)`)
})
