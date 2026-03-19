const { computeBestRoute } = require('./routing/routePlanning')

function allocateNearestAmbulance({ ambulances, graph, trafficState, goalNodeId, corridorEdgesSet }) {
  const available = (ambulances ?? []).filter((a) => a.status === 'Idle')
  const candidates = available.length ? available : ambulances

  let bestAmbulanceId = null
  let bestTimeSeconds = Infinity

  for (const a of candidates) {
    const route = computeBestRoute({
      graph,
      startNodeId: a.nodeId,
      goalNodeId,
      trafficState,
      corridorEdgesSet,
    })
    if (!route) continue
    if (route.totalTimeSeconds < bestTimeSeconds) {
      bestTimeSeconds = route.totalTimeSeconds
      bestAmbulanceId = a.id
    }
  }

  return { assignedAmbulanceId: bestAmbulanceId, bestTimeSeconds }
}

module.exports = { allocateNearestAmbulance }

