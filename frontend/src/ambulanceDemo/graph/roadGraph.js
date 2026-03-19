const ROAD_TYPES = {
  highway: { speedKmh: 90 },
  arterial: { speedKmh: 55 },
  local: { speedKmh: 30 },
}

export function edgeKey(u, v) {
  const a = Math.min(u, v)
  const b = Math.max(u, v)
  return `${a}|${b}`
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth radius (m)
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const sLat1 = Math.sin(dLat / 2)
  const sLon1 = Math.sin(dLon / 2)

  const a =
    sLat1 * sLat1 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sLon1 * sLon1
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function nodeIdAt(row, col, size) {
  return row * size + col
}

export function createDemoGraph({ size = 7 } = {}) {
  // Synthetic “city block” around a known lat/lon so Leaflet has sensible bounds.
  // (We can later swap this for an OSM-derived graph.)
  const origin = { lat: 40.7128, lon: -74.006 }
  const stepLat = 0.0024
  const stepLon = 0.0024

  const nodesById = {}
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = nodeIdAt(r, c, size)
      nodesById[id] = {
        lat: origin.lat + r * stepLat,
        lon: origin.lon + c * stepLon,
      }
    }
  }

  const edgesByKey = {}
  const adjacencyByNodeId = {}
  for (let id = 0; id < size * size; id++) adjacencyByNodeId[id] = []

  const getRoadType = (r, c) => {
    const isBorder = r === 0 || c === 0 || r === size - 1 || c === size - 1
    const mid = Math.floor(size / 2)
    if (isBorder) return 'highway'
    if (r === mid || c === mid) return 'arterial'
    return 'local'
  }

  const addEdge = (u, v, roadType) => {
    const ek = edgeKey(u, v)
    if (edgesByKey[ek]) return

    const nu = nodesById[u]
    const nv = nodesById[v]
    const lengthMeters = haversineMeters(nu.lat, nu.lon, nv.lat, nv.lon)
    edgesByKey[ek] = {
      u,
      v,
      roadType,
      speedKmh: ROAD_TYPES[roadType].speedKmh,
      lengthMeters,
    }

    adjacencyByNodeId[u].push({ to: v, edgeKey: ek })
    adjacencyByNodeId[v].push({ to: u, edgeKey: ek })
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const u = nodeIdAt(r, c, size)

      if (c + 1 < size) {
        const v = nodeIdAt(r, c + 1, size)
        const roadType = getRoadType(r, c)
        addEdge(u, v, roadType)
      }

      if (r + 1 < size) {
        const v = nodeIdAt(r + 1, c, size)
        const roadType = getRoadType(r, c)
        addEdge(u, v, roadType)
      }
    }
  }

  // A couple of diagonals to create alternate fast corridors.
  const mid = Math.floor(size / 2)
  const diagPairs = [
    [nodeIdAt(mid, 0, size), nodeIdAt(mid, size - 1, size)],
    [nodeIdAt(0, mid, size), nodeIdAt(size - 1, mid, size)],
  ]
  diagPairs.forEach(([u, v]) => {
    // Use arterial diagonals for variety.
    const ek = edgeKey(u, v)
    if (!edgesByKey[ek]) {
      const nu = nodesById[u]
      const nv = nodesById[v]
      edgesByKey[ek] = {
        u,
        v,
        roadType: 'arterial',
        speedKmh: ROAD_TYPES.arterial.speedKmh,
        lengthMeters: haversineMeters(nu.lat, nu.lon, nv.lat, nv.lon),
      }
      adjacencyByNodeId[u].push({ to: v, edgeKey: ek })
      adjacencyByNodeId[v].push({ to: u, edgeKey: ek })
    }
  })

  let south = Infinity
  let north = -Infinity
  let west = Infinity
  let east = -Infinity
  Object.values(nodesById).forEach((n) => {
    south = Math.min(south, n.lat)
    north = Math.max(north, n.lat)
    west = Math.min(west, n.lon)
    east = Math.max(east, n.lon)
  })

  const maxSpeedKmh = Math.max(...Object.values(ROAD_TYPES).map((t) => t.speedKmh))

  return {
    nodesById,
    edgesByKey,
    adjacencyByNodeId,
    bbox: { south, west, north, east },
    nodeCount: size * size,
    maxSpeedKmh,
  }
}

export function routeEdgeKeysFromNodes(routeNodes) {
  const edgeKeys = []
  for (let i = 0; i < routeNodes.length - 1; i++) {
    edgeKeys.push(edgeKey(routeNodes[i], routeNodes[i + 1]))
  }
  return edgeKeys
}

export function nearestNodeIdFromLatLng(graph, lat, lon) {
  let bestId = null
  let bestDist = Infinity
  for (const [idStr, n] of Object.entries(graph.nodesById)) {
    const id = Number(idStr)
    const d = haversineMeters(lat, lon, n.lat, n.lon)
    if (d < bestDist) {
      bestDist = d
      bestId = id
    }
  }
  return bestId
}

