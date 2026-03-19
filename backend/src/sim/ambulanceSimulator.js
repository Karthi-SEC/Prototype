const { edgeKey, nearestNodeIdFromLatLng } = require('./graph/roadGraph')

function baseTravelSeconds({ lengthMeters, speedKmh }) {
  const speedMps = (speedKmh * 1000) / 3600
  return lengthMeters / speedMps
}

function edgeCostSeconds({ graph, trafficState, corridorEdgesSet, ek }) {
  const edge = graph.edgesByKey[ek]
  if (!edge) return Infinity

  const baseSeconds = baseTravelSeconds({ lengthMeters: edge.lengthMeters, speedKmh: edge.speedKmh })
  const trafficMultiplier = trafficState[ek]?.multiplier ?? 1.0
  const reductionFactor = corridorEdgesSet?.has(ek) ? 0.55 : 1.0
  const adjustedMultiplier = 1 + (trafficMultiplier - 1) * reductionFactor
  return baseSeconds * adjustedMultiplier
}

function buildMovementPlan({ graph, routeNodes, trafficState, corridorEdgesSet }) {
  const corridor = corridorEdgesSet ?? new Set()
  const segments = []

  let cumulative = 0
  for (let i = 0; i < routeNodes.length - 1; i++) {
    const u = routeNodes[i]
    const v = routeNodes[i + 1]
    const ek = edgeKey(u, v)

    const uNode = graph.nodesById[u]
    const vNode = graph.nodesById[v]
    const durationSeconds = edgeCostSeconds({
      graph,
      trafficState,
      corridorEdgesSet: corridor,
      ek,
    })
    const startSeconds = cumulative
    const endSeconds = cumulative + durationSeconds

    segments.push({
      edgeKey: ek,
      fromId: u,
      toId: v,
      fromLatLng: { lat: uNode.lat, lon: uNode.lon },
      toLatLng: { lat: vNode.lat, lon: vNode.lon },
      durationSeconds,
      startSeconds,
      endSeconds,
    })

    cumulative = endSeconds
  }

  const totalSeconds = cumulative
  const startNodeId = routeNodes[0]
  const goalNodeId = routeNodes[routeNodes.length - 1]
  const goalLatLng = graph.nodesById[goalNodeId]

  return {
    graph,
    routeNodes,
    startNodeId,
    goalNodeId,
    goalLatLng,
    segments,
    totalSeconds,
  }
}

function getPositionAtTime({ movementPlan, tSeconds, phase }) {
  const { graph, startNodeId, goalNodeId, goalLatLng, segments, totalSeconds } = movementPlan

  if (totalSeconds <= 0 || tSeconds <= 0) {
    return {
      latLng: { ...graph.nodesById[startNodeId] },
      status: 'Dispatched',
      arrived: false,
      etaSeconds: totalSeconds,
      nearestNodeId: startNodeId,
    }
  }

  if (tSeconds >= totalSeconds) {
    return {
      latLng: { ...goalLatLng },
      status: 'Arriving',
      arrived: true,
      etaSeconds: 0,
      nearestNodeId: goalNodeId,
    }
  }

  let seg = null
  for (const s of segments) {
    if (tSeconds >= s.startSeconds && tSeconds < s.endSeconds) {
      seg = s
      break
    }
  }
  if (!seg) seg = segments[segments.length - 1]

  const localT = seg.durationSeconds > 0 ? (tSeconds - seg.startSeconds) / seg.durationSeconds : 1
  const lat = seg.fromLatLng.lat + (seg.toLatLng.lat - seg.fromLatLng.lat) * localT
  const lon = seg.fromLatLng.lon + (seg.toLatLng.lon - seg.fromLatLng.lon) * localT

  const etaSeconds = totalSeconds - tSeconds
  const arrivingThreshold = Math.min(8, totalSeconds * 0.15)
  let status = 'On the way'
  if (tSeconds < 2) status = 'Dispatched'
  else if (etaSeconds <= arrivingThreshold) status = 'Arriving'

  // On hospital leg we already know dispatch is done; avoid transient "Dispatched" state.
  if (tSeconds < 2 && phase === 'TO_HOSPITAL') status = 'On the way'

  const nearestNodeId = nearestNodeIdFromLatLng(graph, lat, lon)

  return {
    latLng: { lat, lon },
    status,
    arrived: false,
    etaSeconds,
    nearestNodeId,
  }
}

module.exports = { buildMovementPlan, getPositionAtTime }

