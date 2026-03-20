const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const http = require('http')
const WebSocket = require('ws')
const { URL } = require('url')

const { PORT, CORS_ORIGIN } = require('./config/env')
const { verifyToken } = require('./auth/jwt')
const { addConnection, subscribeToRequest, removeConnection } = require('./websocket/registry')

const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const sosRoutes = require('./routes/sosRoutes')
const hospitalRoutes = require('./routes/hospitalRoutes')
const { getSimSnapshot, setGreenCorridor, cancelSosRequest } = require('./services/sosService')

const app = express()
app.use(helmet())
app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/sos', sosRoutes)
app.use('/api/hospitals', hospitalRoutes)

const httpServer = http.createServer(app)

const wss = new WebSocket.Server({ server: httpServer, path: '/ws' })

function parseTokenFromUrl(reqUrl) {
  const u = new URL(reqUrl, 'http://localhost')
  return u.searchParams.get('token')
}

wss.on('connection', (ws, req) => {
  try {
    const token = parseTokenFromUrl(req.url)
    let userId = null

    // If token exists, verify and extract userId
    if (token) {
      try {
        const payload = verifyToken(token)
        userId = Number(payload.sub)
        ws._userId = userId
        addConnection(userId, ws)
        ws.send(JSON.stringify({ type: 'CONNECTED', payload: { userId } }))
      } catch {
        ws.close()
        return
      }
    } else {
      // Allow unauthenticated connection for emergency tracking
      ws._isEmergency = true
      ws.send(JSON.stringify({ type: 'EMERGENCY_CONNECTED', payload: {} }))
    }

    ws.on('message', (raw) => {
      let msg = null
      try {
        msg = JSON.parse(raw.toString('utf8'))
      } catch {
        return
      }

      if (msg?.type === 'SUBSCRIBE' && msg?.payload?.requestId) {
        const snap = getSimSnapshot(msg.payload.requestId)
        // Register this socket as a subscriber for this requestId.
        // This works for both authenticated and emergency (unauthenticated) users.
        subscribeToRequest(msg.payload.requestId, ws)
        if (userId) addConnection(userId, ws)
        if (snap) {
          ws.send(JSON.stringify({ type: 'TRACKING_SNAPSHOT', payload: snap }))
        }
      }

      if (msg?.type === 'CANCEL_SOS' && msg?.payload?.requestId) {
        cancelSosRequest(msg.payload.requestId)
      }

      if (msg?.type === 'GREEN_CORRIDOR_TOGGLE' && msg?.payload?.requestId) {
        // Only allow if authenticated
        if (!userId) return
        const enabled = !!msg.payload.enabled
        const ok = setGreenCorridor({ requestId: msg.payload.requestId, enabled })
        if (!ok) {
          ws.send(JSON.stringify({ type: 'SOS_ERROR', payload: { message: 'Request not active' } }))
        }
      }
    })

    ws.on('close', () => {
      if (ws._userId) removeConnection(ws)
    })
    ws.on('error', () => {
      if (ws._userId) removeConnection(ws)
    })
  } catch {
    ws.close()
  }
})

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`)
})

