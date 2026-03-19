const { createDemoGraph, nearestNodeIdFromLatLng } = require('../sim/graph/roadGraph')
const { createTrafficEngine } = require('../sim/traffic/trafficEngine')

const GRAPH = createDemoGraph()
const trafficEngine = createTrafficEngine(GRAPH)
let trafficState = trafficEngine.getTrafficState()

// Basic ambulance fleet. In a real app these would come from DB / GPS.
const AMBULANCE_SEEDS = [
  { id: 'amb-1', label: 'Ambulance #1', nodeId: 0 },
  { id: 'amb-2', label: 'Ambulance #2', nodeId: 18 },
  { id: 'amb-3', label: 'Ambulance #3', nodeId: 36 },
]

const ambulances = AMBULANCE_SEEDS.map((a) => ({
  id: a.id,
  label: a.label,
  nodeId: a.nodeId,
  position: { lat: GRAPH.nodesById[a.nodeId].lat, lon: GRAPH.nodesById[a.nodeId].lon },
  status: 'Idle',
  activeRequestId: null,
}))

const trafficUpdateIntervalMs = 3000
setInterval(() => {
  trafficState = trafficEngine.updateTraffic()
}, trafficUpdateIntervalMs)

function getGraph() {
  return GRAPH
}

function getTrafficState() {
  return trafficState
}

function getAmbulances() {
  return ambulances
}

function getNearestNode(lat, lon) {
  return nearestNodeIdFromLatLng(GRAPH, lat, lon)
}

module.exports = { getGraph, getTrafficState, getAmbulances, getNearestNode }

