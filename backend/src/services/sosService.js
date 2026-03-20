const { db } = require('../db')
const { getGraph, getTrafficState, getAmbulances, getNearestNode } = require('./simSystem')
const { planRoutes } = require('../sim/routing/routePlanning')
const { buildMovementPlan, getPositionAtTime } = require('../sim/ambulanceSimulator')
const { allocateNearestAmbulance } = require('../sim/ambulanceAllocator')
const { sendToUser, sendToRequest } = require('../websocket/registry')
const { HOSPITALS } = require('../sim/hospitals')

const activeSims = new Map() // requestId -> sim
const MAX_ACTIVE_DISPATCHES = 2

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

function createNotification(userId, message) {
  db.prepare('INSERT INTO notifications (user_id, message) VALUES (?, ?)').run(userId, message)
  sendToUser(userId, { type: 'NOTIFICATION', payload: { message } })
}

function notifyEmergencyContacts(userId, message) {
  const contacts = db
    .prepare('SELECT * FROM emergency_contacts WHERE user_id = ?')
    .all(userId)
  // We don't send real SMS in this demo; we persist user notification and log contact notifications.
  for (const c of contacts) {
    // eslint-disable-next-line no-console
    console.log(`[Contact notify] ${c.name} (${c.phone}): ${message}`)
  }
}

function getUserContacts(userId) {
  return db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(userId)
}

function chooseDestinationLabel(userLat, userLon) {
  return `Patient Location (${userLat.toFixed(3)}, ${userLon.toFixed(3)})`
}

function getRouteSnapshot({ graph, route, trafficState }) {
  return {
    route: {
      optimal: route.optimal,
      alternatives: route.alternatives,
      // Traffic levels per edgeKey for color-coding.
      trafficState,
      // Convenience for UI: list of alternative route IDs already present in planner.
    },
  }
}

function cancelSosRequest(requestId) {
  const s = activeSims.get(Number(requestId))
  if (!s) return false

  for (const t of s.timers) clearInterval(t)
  activeSims.delete(Number(requestId))

  const amb = getAmbulances().find((a) => a.id === s.assignedAmbulance?.id)
  if (amb) {
    amb.status = 'Idle'
    amb.activeRequestId = null
  }

  db.prepare("UPDATE emergency_requests SET status = 'Cancelled' WHERE id = ?").run(requestId)
  sendToRequest(requestId, { type: 'SOS_CANCELLED', payload: { requestId: Number(requestId) } })
  return true
}

function startSosSimulation({ requestId, userId, userLat, userLon }) {
  const activeCount = [...activeSims.values()].filter((s) => s.phase !== 'DONE').length
  if (activeCount >= MAX_ACTIVE_DISPATCHES) {
    sendToUser(userId, { type: 'SOS_ERROR', payload: { message: 'All ambulances are currently dispatched. Please wait.' } })
    db.prepare("UPDATE emergency_requests SET status = 'Rejected' WHERE id = ?").run(requestId)
    return
  }

  const graph = getGraph()
  const trafficState = getTrafficState()

  const patientGoalNodeId = getNearestNode(userLat, userLon)
  const ambulances = getAmbulances()

  const allocation = allocateNearestAmbulance({
    ambulances,
    graph,
    trafficState,
    goalNodeId: patientGoalNodeId,
    corridorEdgesSet: new Set(),
  })

  const assignedAmbulance = ambulances.find((a) => a.id === allocation.assignedAmbulanceId)
  if (!assignedAmbulance) {
    sendToUser(userId, { type: 'SOS_ERROR', payload: { message: 'No ambulance available' } })
    return
  }

  assignedAmbulance.status = 'Dispatched'
  assignedAmbulance.activeRequestId = requestId

  const corridorEdgesSet = new Set()

  // Select nearest hospital to the patient location (demo).
  const hospital = (() => {
    let best = null
    let bestD = Infinity
    for (const h of HOSPITALS) {
      const node = graph.nodesById[h.nodeId]
      const d = haversineMeters(userLat, userLon, node.lat, node.lon)
      if (d < bestD) {
        bestD = d
        best = { ...h, lat: node.lat, lon: node.lon, distanceMeters: d }
      }
    }
    return best
  })()

  const phase = 'TO_PATIENT'
  const startNodeId = assignedAmbulance.nodeId

  const initialRoute = planRoutes({
    graph,
    startNodeId,
    goalNodeId: patientGoalNodeId,
    trafficState,
    corridorEdgesSet,
    alternativesCount: 3,
  })

  // Persist initial route summary for the request.
  if (initialRoute.optimal) {
    db.prepare(
      `UPDATE emergency_requests
       SET dispatched_ambulance_id = @aid,
           route_total_time_seconds = @t,
           route_total_distance_km = @d,
           status = 'Dispatched'
       WHERE id = @id`,
    ).run({
      id: requestId,
      aid: assignedAmbulance.id,
      t: initialRoute.optimal.totalTimeSeconds,
      d: initialRoute.optimal.totalDistanceKm,
    })
  }

  const initialMovementPlan = initialRoute.optimal
    ? buildMovementPlan({
        graph,
        routeNodes: initialRoute.optimal.routeNodes,
        trafficState,
        corridorEdgesSet,
      })
    : null

  let movementStartMs = Date.now()
  let movementPlan = initialMovementPlan

  const sim = {
    requestId,
    userId,
    userLat,
    userLon,
    phase,
    patientGoalNodeId,
    hospital,
    goalNodeId: patientGoalNodeId,
    corridorEdgesSet,
    ambulances,
    assignedAmbulance,
    movementPlan,
    movementStartMs,
    lastMovementPlanStartNodeId: startNodeId,
    route: initialRoute.optimal,
    alternatives: initialRoute.alternatives,
    lastNotifiedEtaMinutes: null,
    timers: [],
  }

  activeSims.set(requestId, sim)

  // Initial notifications.
  createNotification(userId, `Ambulance dispatched. ETA updating...`)
  notifyEmergencyContacts(userId, `Ambulance dispatched for patient at your contact.`)

  // (Initial snapshot is sent on SUBSCRIBE, not here, to avoid race with WS connect)

  // Recalculate route every 5 seconds (dynamic rerouting).
  const rerouteTimer = setInterval(() => {
    const s = activeSims.get(requestId)
    if (!s) {
      clearInterval(rerouteTimer)
      return
    }

    const currentAmb = getAmbulances().find((a) => a.id === assignedAmbulance.id)
    if (!currentAmb || currentAmb.activeRequestId !== requestId) return

    // Approximate current node based on ambulance's current position.
    const startFromNodeId = getNearestNode(currentAmb.position.lat, currentAmb.position.lon)

    const currentTraffic = getTrafficState()
    const nextRoute = planRoutes({
      graph,
      startNodeId: startFromNodeId,
      goalNodeId: s.goalNodeId,
      trafficState: currentTraffic,
      corridorEdgesSet: s.corridorEdgesSet,
      alternativesCount: 3,
    })

    if (!nextRoute.optimal) return

    const nextMovementPlan = buildMovementPlan({
      graph,
      routeNodes: nextRoute.optimal.routeNodes,
      trafficState: currentTraffic,
      corridorEdgesSet: s.corridorEdgesSet,
    })

    // IMPORTANT:
    // If the ambulance is still closest to the same start node, rebuilding movement from the
    // node coordinates would "rewind" progress along the segment. That can prevent arrival.
    // Only reset movement when the start node changes.
    const shouldResetMovement = startFromNodeId !== s.lastMovementPlanStartNodeId

    if (shouldResetMovement) {
      s.movementPlan = nextMovementPlan
      s.movementStartMs = Date.now()
      s.lastMovementPlanStartNodeId = startFromNodeId
    }

    s.route = nextRoute.optimal
    s.alternatives = nextRoute.alternatives

    sendToRequest(requestId, {
      type: 'ROUTE_UPDATE',
      payload: {
        requestId,
        phase: s.phase,
        routeSnapshot: getRouteSnapshot({ graph, route: nextRoute, trafficState: currentTraffic }),
      },
    })
  }, 5000)

  sim.timers.push(rerouteTimer)

  // Ambulance movement updates.
  const movementTimer = setInterval(() => {
    const s = activeSims.get(requestId)
    if (!s) {
      clearInterval(movementTimer)
      return
    }

    const currentAmb = getAmbulances().find((a) => a.id === assignedAmbulance.id)
    if (!currentAmb || currentAmb.activeRequestId !== requestId) return

    if (!s.movementPlan) return

    const tSeconds = (Date.now() - s.movementStartMs) / 1000
    const pos = getPositionAtTime({ movementPlan: s.movementPlan, tSeconds, phase: s.phase })

    currentAmb.position = { lat: pos.latLng.lat, lon: pos.latLng.lon }
    currentAmb.nodeId = pos.nearestNodeId
    currentAmb.status = pos.status

    // Notify ETA changes near arrival.
    const etaMinutes = Math.ceil(pos.etaSeconds / 60)
    if (pos.status === 'Arriving') {
      if (s.lastNotifiedEtaMinutes == null || etaMinutes < s.lastNotifiedEtaMinutes) {
        s.lastNotifiedEtaMinutes = etaMinutes
        createNotification(userId, `Arriving in ${Math.max(1, etaMinutes)} minute(s).`)
      }
    }

    sendToRequest(requestId, {
      type: 'POSITION_UPDATE',
      payload: {
        requestId,
        phase: s.phase,
        ambulance: {
          id: currentAmb.id,
          label: currentAmb.label,
          position: { ...currentAmb.position },
          status: currentAmb.status,
        },
        etaSeconds: Math.max(0, pos.etaSeconds),
        distanceKm: s.route?.totalDistanceKm ?? null,
      },
    })

    if (pos.arrived) {
      if (s.phase === 'TO_PATIENT') {
        // Switch to hospital dispatch phase.
        s.phase = 'TO_HOSPITAL'
        s.goalNodeId = s.hospital.nodeId
        s.route = null
        s.alternatives = []
        s.lastNotifiedEtaMinutes = null

        currentAmb.status = 'Arriving'
        db.prepare('UPDATE emergency_requests SET status = ? WHERE id = ?').run('Transporting', requestId)

        createNotification(userId, 'Patient reached. Dispatching to hospital...')
        notifyEmergencyContacts(userId, 'Patient pickup complete. Dispatching ambulance to hospital.')

        const nextTraffic = getTrafficState()
        const startFromNodeId = getNearestNode(currentAmb.position.lat, currentAmb.position.lon)
        const nextRoute = planRoutes({
          graph,
          startNodeId: startFromNodeId,
          goalNodeId: s.goalNodeId,
          trafficState: nextTraffic,
          corridorEdgesSet: s.corridorEdgesSet,
          alternativesCount: 3,
        })

        if (nextRoute.optimal) {
          s.route = nextRoute.optimal
          s.alternatives = nextRoute.alternatives

          // If green corridor is active, apply it to the currently selected leg.
          if (s.corridorActive) {
            s.corridorEdgesSet = new Set(nextRoute.optimal.edgeKeys ?? [])
          }

          s.movementPlan = buildMovementPlan({
            graph,
            routeNodes: nextRoute.optimal.routeNodes,
            trafficState: nextTraffic,
            corridorEdgesSet: s.corridorEdgesSet,
          })
          s.movementStartMs = Date.now()
          s.lastMovementPlanStartNodeId = getNearestNode(currentAmb.position.lat, currentAmb.position.lon)

          sendToRequest(requestId, {
            type: 'ROUTE_UPDATE',
            payload: {
              requestId,
              phase: s.phase,
              routeSnapshot: getRouteSnapshot({ graph, route: nextRoute, trafficState: nextTraffic }),
            },
          })
        }
      } else {
        // Finished: ambulance arrived at hospital.
        clearInterval(rerouteTimer)
        clearInterval(movementTimer)

        currentAmb.status = 'Idle'
        currentAmb.activeRequestId = null

        activeSims.delete(requestId)

        db.prepare('UPDATE emergency_requests SET status = ? WHERE id = ?').run('Completed', requestId)
        createNotification(userId, 'Ambulance arrived at hospital. Transfer assistance provided.')
        notifyEmergencyContacts(userId, 'Ambulance arrived at hospital. Transfer assistance underway.')

        sendToRequest(requestId, { type: 'SOS_COMPLETED', payload: { requestId } })
      }
    }
  }, 250)

  sim.timers.push(movementTimer)
}

function createSosRequest({ userId, userLat, userLon }) {
  const destination_label = chooseDestinationLabel(userLat, userLon)

  const result = db
    .prepare(
      `INSERT INTO emergency_requests (user_id, destination_label, status)
       VALUES (@user_id, @destination_label, 'Pending')`,
    )
    .run({ user_id: userId, destination_label })

  const requestId = result.lastInsertRowid

  startSosSimulation({ requestId, userId, userLat, userLon })
  return requestId
}

function getSimSnapshot(requestId) {
  const sim = activeSims.get(Number(requestId))
  if (!sim) return null
  const graph = getGraph()
  const trafficState = getTrafficState()

  // Compute current ambulance position based on elapsed time
  let currentPosition = { ...sim.assignedAmbulance.position }
  let currentStatus = sim.assignedAmbulance.status
  let etaSeconds = null
  if (sim.movementPlan) {
    const tSeconds = (Date.now() - sim.movementStartMs) / 1000
    const pos = getPositionAtTime({ movementPlan: sim.movementPlan, tSeconds, phase: sim.phase })
    currentPosition = { lat: pos.latLng.lat, lon: pos.latLng.lon }
    currentStatus = pos.status
    etaSeconds = Math.max(0, pos.etaSeconds)
  }

  return {
    requestId: sim.requestId,
    userId: sim.userId,
    phase: sim.phase,
    hospital: sim.hospital,
    user: { lat: sim.userLat, lon: sim.userLon },
    userDisplay: (() => {
      const n = getGraph().nodesById[sim.patientGoalNodeId]
      return n ? { lat: n.lat, lon: n.lon } : { lat: sim.userLat, lon: sim.userLon }
    })(),
    ambulance: {
      id: sim.assignedAmbulance.id,
      label: sim.assignedAmbulance.label,
      position: currentPosition,
      status: currentStatus,
    },
    etaSeconds,
    distanceKm: sim.route?.totalDistanceKm ?? null,
    routeSnapshot: getRouteSnapshot({
      graph,
      route: { optimal: sim.route, alternatives: sim.alternatives },
      trafficState,
    }),
  }
}

function setGreenCorridor({ requestId, enabled }) {
  const s = activeSims.get(Number(requestId))
  if (!s) return false
  s.corridorActive = !!enabled

  if (enabled) {
    const edgeKeys = s.route?.edgeKeys ?? []
    s.corridorEdgesSet = new Set(edgeKeys)
    createNotification(s.userId, 'Green Corridor Activated')

    // Recompute immediately so traffic-delay reduction applies right away.
    const graph = getGraph()
    const currentTraffic = getTrafficState()
    const currentAmb = getAmbulances().find((a) => a.id === s.assignedAmbulance.id)
    if (currentAmb) {
      const startFromNodeId = getNearestNode(currentAmb.position.lat, currentAmb.position.lon)
      const nextRoute = planRoutes({
        graph,
        startNodeId: startFromNodeId,
        goalNodeId: s.goalNodeId,
        trafficState: currentTraffic,
        corridorEdgesSet: s.corridorEdgesSet,
        alternativesCount: 3,
      })
      if (nextRoute.optimal) {
        s.route = nextRoute.optimal
        s.alternatives = nextRoute.alternatives
        s.movementPlan = buildMovementPlan({
          graph,
          routeNodes: nextRoute.optimal.routeNodes,
          trafficState: currentTraffic,
          corridorEdgesSet: s.corridorEdgesSet,
        })
        s.movementStartMs = Date.now()

        sendToRequest(requestId, {
          type: 'ROUTE_UPDATE',
          payload: {
            requestId,
            phase: s.phase,
            routeSnapshot: getRouteSnapshot({ graph, route: nextRoute, trafficState: currentTraffic }),
          },
        })
      }
    }
  } else {
    s.corridorEdgesSet = new Set()
    createNotification(s.userId, 'Green Corridor Deactivated')
  }

  return true
}

module.exports = { createSosRequest, getSimSnapshot, setGreenCorridor, cancelSosRequest }

