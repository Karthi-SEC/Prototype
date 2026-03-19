import { useEffect, useMemo, useRef, useState } from 'react'
import LeafletMap from './components/MapView/LeafletMap'
import RouteLayer from './components/MapView/RouteLayer'
import AmbulanceMarkers from './components/MapView/AmbulanceMarkers'
import DashboardPanel from './components/DashboardPanel/DashboardPanel'
import TripControls from './components/Controls/TripControls'
import {
  createDemoGraph,
  nearestNodeIdFromLatLng,
} from './ambulanceDemo/graph/roadGraph'
import { createTrafficEngine } from './ambulanceDemo/traffic/trafficEngine'
import {
  computeBestRoute,
  planRoutes,
} from './ambulanceDemo/sim/routePlanning'
import {
  buildMovementPlan,
  getPositionAtTime,
} from './ambulanceDemo/sim/ambulanceSimulator'
import { allocateNearestAmbulance } from './ambulanceDemo/sim/ambulanceAllocator'
import './app.css'

const DESTINATIONS = [
  { id: 'patient-1', label: 'Patient Site A', kind: 'Patient', nodeId: 6 },
  { id: 'patient-2', label: 'Patient Site B', kind: 'Patient', nodeId: 20 },
  { id: 'patient-3', label: 'Patient Site C', kind: 'Patient', nodeId: 30 },
  { id: 'hospital-1', label: 'Hospital Alpha', kind: 'Hospital', nodeId: 10 },
  { id: 'hospital-2', label: 'Hospital Beta', kind: 'Hospital', nodeId: 42 },
]

const AMBULANCE_SEEDS = [
  { id: 'amb-1', label: 'Ambulance #1', nodeId: 0 },
  { id: 'amb-2', label: 'Ambulance #2', nodeId: 18 },
  { id: 'amb-3', label: 'Ambulance #3', nodeId: 36 },
]

function App() {
  const graph = useMemo(() => createDemoGraph(), [])
  const trafficEngine = useMemo(() => createTrafficEngine(graph), [graph])

  const [trafficState, setTrafficState] = useState(() => trafficEngine.getTrafficState())
  const trafficRef = useRef(trafficState)
  useEffect(() => {
    trafficRef.current = trafficState
  }, [trafficState])

  const [ambulances, setAmbulances] = useState(() =>
    AMBULANCE_SEEDS.map((a) => {
      const n = graph.nodesById[a.nodeId]
      return {
        id: a.id,
        label: a.label,
        nodeId: a.nodeId,
        position: { lat: n.lat, lon: n.lon },
        status: 'Idle',
      }
    }),
  )
  const ambulancesRef = useRef(ambulances)
  useEffect(() => {
    ambulancesRef.current = ambulances
  }, [ambulances])

  const [autoAssign, setAutoAssign] = useState(true)
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('amb-1')
  const [selectedDestinationId, setSelectedDestinationId] = useState(DESTINATIONS[0].id)

  const [dispatch, setDispatch] = useState({
    active: false,
    destinationId: null,
    destinationNodeId: null,
    dispatchedAtMs: 0,
    assignedAmbulanceId: null,
  })
  const dispatchRef = useRef(dispatch)
  useEffect(() => {
    dispatchRef.current = dispatch
  }, [dispatch])

  const [routing, setRouting] = useState({
    optimal: null,
    alternatives: [],
    corridorActive: false,
    corridorEdgesSet: new Set(),
  })
  const routingRef = useRef(routing)
  useEffect(() => {
    routingRef.current = routing
  }, [routing])

  const movementRef = useRef(null)
  const [etaSeconds, setEtaSeconds] = useState(null)
  const [distanceKm, setDistanceKm] = useState(null)
  const [trafficSummary, setTrafficSummary] = useState('Low')
  const [greenMsg, setGreenMsg] = useState(null)

  const destination = useMemo(
    () => DESTINATIONS.find((d) => d.id === selectedDestinationId) ?? DESTINATIONS[0],
    [selectedDestinationId],
  )

  const recomputeRouteNow = (opts = {}) => {
    const { corridorEdgesSetOverride } = opts
    const dispatchSnapshot = dispatchRef.current
    const routingSnapshot = routingRef.current
    if (!dispatchSnapshot.active || !dispatchSnapshot.assignedAmbulanceId) return

    const assigned = ambulancesRef.current.find(
      (a) => a.id === dispatchSnapshot.assignedAmbulanceId,
    )
    if (!assigned) return

    const goalNodeId = dispatchSnapshot.destinationNodeId
    const startNodeId = nearestNodeIdFromLatLng(graph, assigned.position.lat, assigned.position.lon)

    const corridorEdgesSet =
      corridorEdgesSetOverride ??
      (routingSnapshot.corridorActive ? routingSnapshot.corridorEdgesSet : new Set())

    const best = computeBestRoute({
      graph,
      startNodeId,
      goalNodeId,
      trafficState: trafficRef.current,
      corridorEdgesSet,
    })

    const full = planRoutes({
      graph,
      startNodeId,
      goalNodeId,
      trafficState: trafficRef.current,
      corridorEdgesSet,
      alternativesCount: 3,
    })

    // Reset movement plan to keep ETA accurate after dynamic rerouting.
    const movementPlan = buildMovementPlan({
      graph,
      routeNodes: full.optimal.routeNodes,
      trafficState: trafficRef.current,
      corridorEdgesSet,
    })
    movementRef.current = {
      movementPlan,
      startMs: Date.now(),
    }

    setRouting((r) => ({
      ...r,
      optimal: full.optimal,
      alternatives: full.alternatives,
    }))
    setDistanceKm(best.totalDistanceKm)
    setEtaSeconds(best.totalTimeSeconds)
    setTrafficSummary(best.trafficLabel)

    setAmbulances((prev) =>
      prev.map((a) =>
        a.id === assigned.id
          ? { ...a, nodeId: startNodeId, status: 'Dispatched' }
          : a,
      ),
    )
  }

  const dispatchRequest = () => {
    const goalNodeId = destination.nodeId
    const currentTraffic = trafficRef.current

    let assignedId = selectedAmbulanceId
    if (autoAssign) {
      const allocation = allocateNearestAmbulance({
        ambulances,
        graph,
        trafficState: currentTraffic,
        goalNodeId,
        corridorEdgesSet: routing.corridorEdgesSet,
      })
      assignedId = allocation.assignedAmbulanceId
    }

    const assigned = ambulances.find((a) => a.id === assignedId)
    if (!assigned) return

    const startNodeId = assigned.nodeId
    const corridorEdgesSet = new Set() // corridor applies after activation

    const full = planRoutes({
      graph,
      startNodeId,
      goalNodeId,
      trafficState: currentTraffic,
      corridorEdgesSet,
      alternativesCount: 3,
    })

    const movementPlan = buildMovementPlan({
      graph,
      routeNodes: full.optimal.routeNodes,
      trafficState: currentTraffic,
      corridorEdgesSet,
    })
    movementRef.current = { movementPlan, startMs: Date.now() }

    setRouting({
      optimal: full.optimal,
      alternatives: full.alternatives,
      corridorActive: false,
      corridorEdgesSet: new Set(),
    })
    setDistanceKm(full.optimal.totalDistanceKm)
    setEtaSeconds(full.optimal.totalTimeSeconds)
    setTrafficSummary(full.optimal.trafficLabel)

    setAmbulances((prev) =>
      prev.map((a) =>
        a.id === assignedId
          ? {
              ...a,
              nodeId: startNodeId,
              status: 'Dispatched',
              position: { ...graph.nodesById[startNodeId] },
            }
          : a,
      ),
    )

    setDispatch({
      active: true,
      destinationId: destination.id,
      destinationNodeId: goalNodeId,
      dispatchedAtMs: Date.now(),
      assignedAmbulanceId: assignedId,
    })
  }

  const activateGreenCorridor = () => {
    if (!dispatch.active) return
    if (!routing.optimal) return

    const newCorridorEdgesSet = new Set(routing.optimal.edgeKeys)
    setRouting((r) => ({
      ...r,
      corridorActive: true,
      corridorEdgesSet: newCorridorEdgesSet,
    }))
    setGreenMsg('Green Corridor Activated')
    window.setTimeout(() => setGreenMsg(null), 4500)

    // Recompute immediately so delay reduction and visuals take effect right away.
    // We keep the corridor edges fixed to those from the optimal route at activation time.
    recomputeRouteNow({ corridorEdgesSetOverride: newCorridorEdgesSet })
  }

  // Traffic simulation: update congestion every few seconds.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTrafficState(trafficEngine.updateTraffic())
    }, 3000)
    return () => window.clearInterval(id)
  }, [trafficEngine])

  // Dynamic rerouting every 5 seconds while dispatch is active.
  useEffect(() => {
    if (!dispatch.active) return
    const id = window.setInterval(() => {
      recomputeRouteNow()
    }, 5000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch.active])

  // Ambulance movement simulation (real-time marker updates).
  useEffect(() => {
    if (!dispatch.active) return

    const id = window.setInterval(() => {
      const movement = movementRef.current
      if (!movement?.movementPlan) return

      const tSeconds = (Date.now() - movement.startMs) / 1000
      const pos = getPositionAtTime({ movementPlan: movement.movementPlan, tSeconds })

      setAmbulances((prev) =>
        prev.map((a) => {
          if (a.id !== dispatch.assignedAmbulanceId) return a
          return {
            ...a,
            nodeId: pos.nearestNodeId ?? a.nodeId,
            position: pos.latLng,
            status: pos.status,
          }
        }),
      )

      setEtaSeconds(Math.max(0, pos.etaSeconds))
      if (pos.arrived) {
        setDispatch((d) => ({ ...d, active: false }))
        movementRef.current = null
      }
    }, 250)

    return () => window.clearInterval(id)
  }, [dispatch.active, dispatch.assignedAmbulanceId])

  const routesForRender = useMemo(() => {
    if (!routing.optimal) return []
    const optimal = routing.optimal
    const alternatives = routing.alternatives ?? []
    return [
      { id: 'optimal', nodes: optimal.routeNodes, edgeKeys: optimal.edgeKeys, isOptimal: true },
      ...alternatives.map((r, idx) => ({
        id: `alt-${idx + 1}`,
        nodes: r.routeNodes,
        edgeKeys: r.edgeKeys,
        isOptimal: false,
      })),
    ]
  }, [routing.optimal, routing.alternatives])

  const optimalRouteNodes = routing.optimal?.routeNodes ?? []
  const assignedAmbulance = dispatch.assignedAmbulanceId
    ? ambulances.find((a) => a.id === dispatch.assignedAmbulanceId)
    : null

  return (
    <div className="appShell">
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 52,
        background: 'rgba(6,11,22,0.85)',
        borderBottom: '1px solid rgba(99,130,190,0.15)',
        backdropFilter: 'blur(20px)',
        zIndex: 1200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🚑</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#f0f4ff', lineHeight: 1 }}>MediRoute</div>
            <div style={{ fontSize: 10, color: '#4a5a7a', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Simulation Mode</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
            <div className="pulseDot" style={{ width: 6, height: 6 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#86efac' }}>Traffic Simulation Active</span>
          </div>
          <div style={{ fontSize: 11, color: '#4a5a7a', fontWeight: 600 }}>
            {ambulances.filter(a => a.status === 'Idle').length} idle · {ambulances.filter(a => a.status !== 'Idle').length} active
          </div>
        </div>
      </div>

      <div className="mapLayer" style={{ top: 52 }}>
        <LeafletMap graph={graph} routeNodes={optimalRouteNodes}>
          <RouteLayer
            graph={graph}
            routes={routesForRender}
            trafficState={trafficState}
            greenCorridorActive={routing.corridorActive}
            corridorEdgesSet={routing.corridorEdgesSet}
          />
          <AmbulanceMarkers ambulances={ambulances} assignedId={assignedAmbulance?.id ?? null} />
        </LeafletMap>
      </div>

      <div className="panelRow" style={{ top: 68 }}>
        <TripControls
          graph={graph}
          destinations={DESTINATIONS}
          ambulances={ambulances}
          autoAssign={autoAssign}
          onToggleAutoAssign={setAutoAssign}
          selectedAmbulanceId={selectedAmbulanceId}
          onSelectAmbulance={setSelectedAmbulanceId}
          selectedDestinationId={selectedDestinationId}
          onSelectDestination={setSelectedDestinationId}
          dispatchActive={dispatch.active}
          onDispatch={dispatchRequest}
          onActivateGreenCorridor={activateGreenCorridor}
          greenCorridorActive={routing.corridorActive}
        />
      </div>

      <DashboardPanel
        dispatchActive={dispatch.active}
        assignedLabel={assignedAmbulance?.label ?? '—'}
        assignedStatus={assignedAmbulance?.status ?? '—'}
        etaSeconds={etaSeconds}
        distanceKm={distanceKm}
        trafficSummary={trafficSummary}
        alternatives={routing.alternatives}
        optimal={routing.optimal}
        greenMsg={greenMsg}
      />
    </div>
  )
}

export default App
