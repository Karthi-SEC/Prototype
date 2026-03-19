const { edgeKey } = require('../graph/roadGraph')

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function reconstructPath(cameFrom, current) {
  const totalPath = [current]
  while (cameFrom[current] != null) {
    current = cameFrom[current]
    totalPath.push(current)
  }
  totalPath.reverse()
  return totalPath
}

function findPathAStarTimeWeighted({ graph, startNodeId, goalNodeId, edgeCostSeconds }) {
  const start = Number(startNodeId)
  const goal = Number(goalNodeId)

  if (start === goal) return { routeNodes: [start], edgeKeys: [], totalTimeSeconds: 0 }

  const openSet = new Set([start])
  const closedSet = new Set()

  const cameFrom = {}
  const gScore = {}
  const fScore = {}

  const heuristicSeconds = (aId, bId) => {
    const a = graph.nodesById[aId]
    const b = graph.nodesById[bId]
    const meters = haversineMeters(a.lat, a.lon, b.lat, b.lon)
    const maxSpeedMps = (graph.maxSpeedKmh * 1000) / 3600
    return meters / maxSpeedMps
  }

  gScore[start] = 0
  fScore[start] = heuristicSeconds(start, goal)

  const pickLowestF = () => {
    let bestNode = null
    let bestF = Infinity
    for (const node of openSet) {
      const f = fScore[node] ?? Infinity
      if (f < bestF) {
        bestF = f
        bestNode = node
      }
    }
    return bestNode
  }

  while (openSet.size > 0) {
    const current = pickLowestF()
    if (current == null) break

    if (current === goal) {
      const routeNodes = reconstructPath(cameFrom, current)
      const edgeKeys = []
      let totalTimeSeconds = 0
      for (let i = 0; i < routeNodes.length - 1; i++) {
        const u = routeNodes[i]
        const v = routeNodes[i + 1]
        const ek = edgeKey(u, v)
        edgeKeys.push(ek)
        totalTimeSeconds += edgeCostSeconds(ek, u, v)
      }
      return { routeNodes, edgeKeys, totalTimeSeconds }
    }

    openSet.delete(current)
    closedSet.add(current)

    const neighbors = graph.adjacencyByNodeId[current] ?? []
    for (const { to: neighbor, edgeKey: neighborEdgeKey } of neighbors) {
      if (closedSet.has(neighbor)) continue

      const tentativeG = (gScore[current] ?? Infinity) + edgeCostSeconds(neighborEdgeKey, current, neighbor)
      const known = gScore[neighbor] ?? Infinity
      if (tentativeG < known) {
        cameFrom[neighbor] = current
        gScore[neighbor] = tentativeG
        fScore[neighbor] = tentativeG + heuristicSeconds(neighbor, goal)
        openSet.add(neighbor)
      }
    }
  }

  return null
}

module.exports = { findPathAStarTimeWeighted }

