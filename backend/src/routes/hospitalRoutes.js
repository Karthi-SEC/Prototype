const express = require('express')
const { z } = require('zod')
const { getGraph } = require('../services/simSystem')

const router = express.Router()

const HOSPITALS = [
  { id: 'hospital-1', label: 'Hospital Alpha', nodeId: 10 },
  { id: 'hospital-2', label: 'Hospital Beta', nodeId: 42 },
  { id: 'hospital-3', label: 'Hospital Gamma', nodeId: 30 },
  { id: 'hospital-4', label: 'Hospital Delta', nodeId: 6 },
]

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

router.get('/nearby', (req, res) => {
  const schema = z.object({
    lat: z.coerce.number(),
    lon: z.coerce.number(),
  })
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { lat, lon } = parsed.data
  const graph = getGraph()

  const list = HOSPITALS.map((h) => {
    const node = graph.nodesById[h.nodeId]
    const d = haversineMeters(lat, lon, node.lat, node.lon)
    return { ...h, lat: node.lat, lon: node.lon, distanceMeters: d }
  })

  list.sort((a, b) => a.distanceMeters - b.distanceMeters)
  return res.json({ hospitals: list.slice(0, 3) })
})

module.exports = router

