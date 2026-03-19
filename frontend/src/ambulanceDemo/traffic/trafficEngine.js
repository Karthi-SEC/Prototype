const LEVELS = ['low', 'medium', 'high']

const levelToMultiplier = {
  low: 1.0,
  medium: 1.35,
  high: 1.8,
}

export function getTrafficColorForLevel(level) {
  switch (level) {
    case 'low':
      return '#22c55e' // green
    case 'medium':
      return '#facc15' // yellow
    case 'high':
      return '#ef4444' // red
    default:
      return '#94a3b8'
  }
}

export function trafficLabelFromAverageMultiplier(avgMultiplier) {
  if (avgMultiplier <= 1.15) return 'Low'
  if (avgMultiplier <= 1.55) return 'Moderate'
  return 'Heavy'
}

function randomPickWeighted(weights) {
  const entries = Object.entries(weights)
  const r = Math.random()
  let acc = 0
  for (const [k, w] of entries) {
    acc += w
    if (r <= acc) return k
  }
  return entries[entries.length - 1][0]
}

function baseDistributionForRoadType(roadType) {
  if (roadType === 'highway') return { low: 0.72, medium: 0.23, high: 0.05 }
  if (roadType === 'arterial') return { low: 0.45, medium: 0.40, high: 0.15 }
  return { low: 0.22, medium: 0.48, high: 0.30 }
}

function sampleNextLevel(prevLevel, roadType) {
  // With most updates, we keep the previous state to simulate gradual changes.
  const changeChance = roadType === 'highway' ? 0.25 : roadType === 'arterial' ? 0.33 : 0.4
  if (Math.random() > changeChance) return prevLevel

  const base = baseDistributionForRoadType(roadType)
  // Slight inertia: if we are currently high, base distribution is shifted towards high.
  if (prevLevel === 'high') {
    return randomPickWeighted({
      low: base.low * 0.8,
      medium: base.medium * 1.0,
      high: base.high * 1.35,
    })
  }
  if (prevLevel === 'low') {
    return randomPickWeighted({
      low: base.low * 1.2,
      medium: base.medium * 1.0,
      high: base.high * 0.7,
    })
  }

  return randomPickWeighted(base)
}

export function createTrafficEngine(graph) {
  let trafficState = {}

  // Initialize each edge with a level based on road type.
  for (const [ek, edge] of Object.entries(graph.edgesByKey)) {
    const base = baseDistributionForRoadType(edge.roadType)
    const level = randomPickWeighted(base)
    trafficState[ek] = { level, multiplier: levelToMultiplier[level] }
  }

  const updateTraffic = () => {
    const next = {}
    for (const [ek, edge] of Object.entries(graph.edgesByKey)) {
      const prev = trafficState[ek] ?? { level: 'low', multiplier: 1.0 }
      const nextLevel = sampleNextLevel(prev.level, edge.roadType)
      next[ek] = { level: nextLevel, multiplier: levelToMultiplier[nextLevel] }
    }
    trafficState = next
    return trafficState
  }

  return {
    getTrafficState: () => trafficState,
    updateTraffic,
    trafficLabelFromAverageMultiplier,
  }
}

