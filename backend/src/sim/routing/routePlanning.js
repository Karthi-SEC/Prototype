const { findPathAStarTimeWeighted } = require('./aStarTimeWeighted')
const {
  routeEdgeKeysFromNodes,
} = require('../graph/roadGraph')
const { trafficLabelFromAverageMultiplier } = require('../traffic/trafficEngine')

function baseTravelSeconds({ lengthMeters, speedKmh }) {
  const speedMps = (speedKmh * 1000) / 3600
  return lengthMeters / speedMps
}

function buildEdgeCostSeconds({ graph, trafficState, corridorEdgesSet, edgePenalty }) {
  const corridor = corridorEdgesSet ?? new Set()
  const penalty = edgePenalty ?? {}

  return (ek) => {
    const edge = graph.edgesByKey[ek]
    if (!edge) return Infinity

    const baseSeconds = baseTravelSeconds({
      lengthMeters: edge.lengthMeters,
      speedKmh: edge.speedKmh,
    })

    const trafficMultiplier = trafficState[ek]?.multiplier ?? 1.0

    // traffic_delay is effectively reduced on corridor edges
    // => total = base * (1 + (trafficMultiplier - 1) * reductionFactor)
    const reductionFactor = corridor.has(ek) ? 0.55 : 1.0
    const adjustedMultiplier = 1 + (trafficMultiplier - 1) * reductionFactor

    let seconds = baseSeconds * adjustedMultiplier

    if (penalty.edgeKey && ek === penalty.edgeKey) {
      seconds *= penalty.factor
    }

    return seconds
  }
}

function computeTrafficLabel({ edgeKeys, trafficState }) {
  const avgMultiplier =
    edgeKeys.reduce((sum, ek) => sum + (trafficState[ek]?.multiplier ?? 1.0), 0) /
    Math.max(1, edgeKeys.length)

  return trafficLabelFromAverageMultiplier(avgMultiplier)
}

function computeBestRoute({ graph, startNodeId, goalNodeId, trafficState, corridorEdgesSet }) {
  const edgeCostSecondsByEdgeKey = buildEdgeCostSeconds({
    graph,
    trafficState,
    corridorEdgesSet,
  })

  const result = findPathAStarTimeWeighted({
    graph,
    startNodeId,
    goalNodeId,
    edgeCostSeconds: (ek) => edgeCostSecondsByEdgeKey(ek),
  })

  if (!result) return null

  const edgeKeys = routeEdgeKeysFromNodes(result.routeNodes)
  const totalDistanceMeters = edgeKeys.reduce((sum, ek) => sum + graph.edgesByKey[ek].lengthMeters, 0)
  const totalDistanceKm = totalDistanceMeters / 1000

  const trafficLabel = computeTrafficLabel({ edgeKeys, trafficState })

  return {
    routeNodes: result.routeNodes,
    edgeKeys,
    totalTimeSeconds: result.totalTimeSeconds,
    totalDistanceKm,
    trafficLabel,
  }
}

function computeRouteWithPenalty({
  graph,
  startNodeId,
  goalNodeId,
  trafficState,
  corridorEdgesSet,
  penalty,
}) {
  const edgeCostSecondsByEdgeKey = buildEdgeCostSeconds({
    graph,
    trafficState,
    corridorEdgesSet,
    edgePenalty: penalty,
  })

  // Actual time shown to UI should be based on real traffic/corridor only (no artificial penalty).
  const edgeCostActualSecondsByEdgeKey = buildEdgeCostSeconds({
    graph,
    trafficState,
    corridorEdgesSet,
  })

  const result = findPathAStarTimeWeighted({
    graph,
    startNodeId,
    goalNodeId,
    edgeCostSeconds: (ek) => edgeCostSecondsByEdgeKey(ek),
  })

  if (!result) return null

  const edgeKeys = routeEdgeKeysFromNodes(result.routeNodes)
  const totalDistanceMeters = edgeKeys.reduce((sum, ek) => sum + graph.edgesByKey[ek].lengthMeters, 0)
  const totalDistanceKm = totalDistanceMeters / 1000

  const totalTimeSeconds = edgeKeys.reduce((sum, ek) => sum + edgeCostActualSecondsByEdgeKey(ek), 0)
  const trafficLabel = computeTrafficLabel({ edgeKeys, trafficState })

  return {
    routeNodes: result.routeNodes,
    edgeKeys,
    totalTimeSeconds,
    totalDistanceKm,
    trafficLabel,
  }
}

function planRoutes({
  graph,
  startNodeId,
  goalNodeId,
  trafficState,
  corridorEdgesSet,
  alternativesCount = 3,
}) {
  const optimal = computeBestRoute({ graph, startNodeId, goalNodeId, trafficState, corridorEdgesSet })
  if (!optimal) return { optimal: null, alternatives: [] }

  const alternatives = []
  const seen = new Set([optimal.edgeKeys.join(',')])

  const edgeCount = optimal.edgeKeys.length
  const candidateIndices = []
  if (edgeCount >= 4) {
    candidateIndices.push(Math.floor(edgeCount * 0.25))
    candidateIndices.push(Math.floor(edgeCount * 0.5))
    candidateIndices.push(Math.floor(edgeCount * 0.75))
  }

  const penaltyFactorByIndex = [1.7, 2.0, 2.3]

  for (let i = 0; i < Math.min(alternativesCount, candidateIndices.length); i++) {
    const idx = candidateIndices[i]
    const penalizedEdgeKey = optimal.edgeKeys[idx]
    if (!penalizedEdgeKey) continue

    const penaltyFactor = penaltyFactorByIndex[i] ?? 2.0

    const alt = computeRouteWithPenalty({
      graph,
      startNodeId,
      goalNodeId,
      trafficState,
      corridorEdgesSet,
      penalty: { edgeKey: penalizedEdgeKey, factor: penaltyFactor },
    })

    if (!alt) continue
    const sig = alt.edgeKeys.join(',')
    if (seen.has(sig)) continue
    seen.add(sig)
    alternatives.push(alt)
  }

  if (alternatives.length < alternativesCount && edgeCount >= 3) {
    for (let i = 0; alternatives.length < alternativesCount && i < edgeCount; i += 2) {
      const penalizedEdgeKey = optimal.edgeKeys[i]
      if (!penalizedEdgeKey) continue

      const alt = computeRouteWithPenalty({
        graph,
        startNodeId,
        goalNodeId,
        trafficState,
        corridorEdgesSet,
        penalty: { edgeKey: penalizedEdgeKey, factor: 2.4 },
      })

      if (!alt) continue
      const sig = alt.edgeKeys.join(',')
      if (seen.has(sig)) continue
      seen.add(sig)
      alternatives.push(alt)
    }
  }

  return {
    optimal,
    alternatives: alternatives.slice(0, alternativesCount).map((r, idx) => ({ ...r, id: `alt-${idx + 1}` })),
  }
}

module.exports = { computeBestRoute, planRoutes }

