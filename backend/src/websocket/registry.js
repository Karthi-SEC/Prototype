const userConnections = new Map()    // userId -> Set<WebSocket>
const requestSubscribers = new Map() // requestId -> Set<WebSocket>

function addConnection(userId, ws) {
  const key = String(userId)
  if (!userConnections.has(key)) userConnections.set(key, new Set())
  userConnections.get(key).add(ws)
}

function subscribeToRequest(requestId, ws) {
  const key = String(requestId)
  if (!requestSubscribers.has(key)) requestSubscribers.set(key, new Set())
  requestSubscribers.get(key).add(ws)
  ws._subscribedRequestId = key
}

function removeConnection(ws) {
  for (const [, set] of userConnections) {
    set.delete(ws)
  }
  if (ws._subscribedRequestId) {
    const set = requestSubscribers.get(ws._subscribedRequestId)
    if (set) set.delete(ws)
  }
}

function sendToUser(userId, payload) {
  const key = String(userId)
  const set = userConnections.get(key)
  const msg = JSON.stringify(payload)
  if (set) {
    for (const ws of set) {
      if (ws.readyState === 1) ws.send(msg)
    }
  }
}

function sendToRequest(requestId, payload) {
  const key = String(requestId)
  const set = requestSubscribers.get(key)
  if (!set) return
  const msg = JSON.stringify(payload)
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

module.exports = { addConnection, subscribeToRequest, removeConnection, sendToUser, sendToRequest }
