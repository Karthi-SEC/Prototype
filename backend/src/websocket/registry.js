const connections = new Map() // userId -> Set<WebSocket>

function addConnection(userId, ws) {
  const key = String(userId)
  if (!connections.has(key)) connections.set(key, new Set())
  connections.get(key).add(ws)
}

function removeConnection(ws) {
  for (const [, set] of connections) {
    if (set.has(ws)) set.delete(ws)
  }
}

function sendToUser(userId, payload) {
  const key = String(userId)
  const set = connections.get(key)
  if (!set) return
  const msg = JSON.stringify(payload)
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(msg) // 1 === WebSocket.OPEN
  }
}

module.exports = { addConnection, removeConnection, sendToUser }

