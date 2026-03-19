import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AuthContext } from '../AppRouter'
import LeafletMap from '../components/MapView/LeafletMap'
import RouteLayer from '../components/MapView/RouteLayer'
import AmbulanceMarkers from '../components/MapView/AmbulanceMarkers'
import UserLocationMarker from '../components/MapView/UserLocationMarker'
import { createDemoGraph } from '../ambulanceDemo/graph/roadGraph'

function formatEta(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—'
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}

function routeToRoutesForRender(graph, routeSnapshot) {
  if (!routeSnapshot?.route) return []
  const { optimal, alternatives } = routeSnapshot.route
  const routes = []
  if (optimal) routes.push({ id: 'optimal', nodes: optimal.routeNodes, edgeKeys: optimal.edgeKeys, isOptimal: true })
  ;(alternatives ?? []).forEach((alt) => {
    routes.push({ id: alt.id ?? `alt-${routes.length + 1}`, nodes: alt.routeNodes, edgeKeys: alt.edgeKeys, isOptimal: false })
  })
  return routes
}

function statusTheme(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'dispatched') return { color: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: '🚑' }
  if (s === 'on the way') return { color: '#fcd34d', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '⚡' }
  if (s === 'arriving') return { color: '#86efac', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: '📍' }
  if (s === 'arrived') return { color: '#86efac', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', icon: '✅' }
  return { color: '#8b9dc3', bg: 'rgba(99,130,190,0.1)', border: 'rgba(99,130,190,0.2)', icon: '⏳' }
}

export default function SOSTrackingPage() {
  const auth = useContext(AuthContext)
  const { requestId } = useParams()
  const navigate = useNavigate()
  const graph = useMemo(() => createDemoGraph(), [])
  const wsRef = useRef(null)

  const [error, setError] = useState(null)
  const [userPosition, setUserPosition] = useState(null)
  const [ambulance, setAmbulance] = useState(null)
  const [etaSeconds, setEtaSeconds] = useState(null)
  const [distanceKm, setDistanceKm] = useState(null)
  const [routeSnapshot, setRouteSnapshot] = useState(null)
  const [phase, setPhase] = useState(null)
  const [hospital, setHospital] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [connected, setConnected] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  const [greenCorridorEnabled, setGreenCorridorEnabled] = useState(false)
  const [corridorEdgeKeys, setCorridorEdgeKeys] = useState([])
  const greenCorridorEnabledRef = useRef(greenCorridorEnabled)

  useEffect(() => {
    greenCorridorEnabledRef.current = greenCorridorEnabled
  }, [greenCorridorEnabled])

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const routesForRender = useMemo(() => routeToRoutesForRender(graph, routeSnapshot), [graph, routeSnapshot])
  const trafficState = routeSnapshot?.route?.trafficState ?? null
  const optimalRouteNodes = routeSnapshot?.route?.optimal?.routeNodes ?? []

  useEffect(() => {
    let cancelled = false
    const token = auth?.token
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
    const wsBase = apiBase.replace(/^http/, 'ws')
    
    // Build WebSocket URL - token is optional for emergency tracking
    let wsUrl = `${wsBase}/ws`
    if (token) {
      wsUrl += `?token=${encodeURIComponent(token)}`
    }
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (!cancelled) setConnected(true)
      ws.send(JSON.stringify({ type: 'SUBSCRIBE', payload: { requestId } }))
    }

    ws.onmessage = (ev) => {
      if (cancelled) return
      let msg = null
      try { msg = JSON.parse(ev.data) } catch { return }
      if (msg.type === 'SOS_ERROR') setError(msg.payload?.message || 'SOS error')
      if (msg.type === 'EMERGENCY_CONNECTED' || msg.type === 'CONNECTED') {
        // Successfully connected
      }
      if (msg.type === 'TRACKING_SNAPSHOT') {
        const snap = msg.payload
        setUserPosition(snap.user ?? null)
        setAmbulance(snap.ambulance ? { ...snap.ambulance, position: snap.ambulance.position } : null)
        setEtaSeconds(snap.etaSeconds ?? null)
        setDistanceKm(snap.distanceKm ?? null)
        setRouteSnapshot(snap.routeSnapshot ?? null)
        setPhase(snap.phase ?? null)
        setHospital(snap.hospital ?? null)
      }
      if (msg.type === 'ROUTE_UPDATE') {
        setRouteSnapshot(msg.payload?.routeSnapshot ?? null)
        setPhase(msg.payload?.phase ?? null)
        if (greenCorridorEnabledRef.current) {
          const edgeKeys = msg.payload?.routeSnapshot?.route?.optimal?.edgeKeys ?? []
          setCorridorEdgeKeys(edgeKeys)
        }
      }
      if (msg.type === 'POSITION_UPDATE') {
        setPhase(msg.payload?.phase ?? null)
        setAmbulance({
          id: msg.payload.ambulance.id,
          label: msg.payload.ambulance.label,
          position: msg.payload.ambulance.position,
          status: msg.payload.ambulance.status,
        })
        setEtaSeconds(msg.payload.etaSeconds ?? null)
        setDistanceKm(msg.payload.distanceKm ?? null)
      }
      if (msg.type === 'NOTIFICATION') {
        const m = msg.payload?.message
        if (!m) return
        setNotifications((prev) => [{ text: m, id: Date.now() }, ...prev].slice(0, 4))
      }
    }

    ws.onerror = () => { if (!cancelled) setError('WebSocket connection failed') }
    ws.onclose = () => { if (!cancelled) setConnected(false) }

    return () => {
      cancelled = true
      try { ws.close() } catch {}
    }
  }, [auth?.token, requestId])

  const theme = statusTheme(ambulance?.status)

  const corridorSet = useMemo(() => new Set(corridorEdgeKeys ?? []), [corridorEdgeKeys])

  const toggleGreenCorridor = () => {
    if (greenCorridorEnabled) {
      setGreenCorridorEnabled(false)
      setCorridorEdgeKeys([])
      greenCorridorEnabledRef.current = false
      wsRef.current?.send(
        JSON.stringify({
          type: 'GREEN_CORRIDOR_TOGGLE',
          payload: { requestId, enabled: false },
        }),
      )
      return
    }

    const edgeKeys = routeSnapshot?.route?.optimal?.edgeKeys ?? []
    if (!edgeKeys.length) return

    setGreenCorridorEnabled(true)
    setCorridorEdgeKeys(edgeKeys)
    greenCorridorEnabledRef.current = true
    wsRef.current?.send(
      JSON.stringify({
        type: 'GREEN_CORRIDOR_TOGGLE',
        payload: { requestId, enabled: true },
      }),
    )
  }

  return (
    <div className="appShell">
      <div className="mapLayer">
        <LeafletMap graph={graph} routeNodes={optimalRouteNodes}>
          <RouteLayer
            graph={graph}
            routes={routesForRender}
            trafficState={trafficState ?? {}}
            greenCorridorActive={greenCorridorEnabled}
            corridorEdgesSet={corridorSet}
          />
          <UserLocationMarker position={userPosition} />
          {ambulance && <AmbulanceMarkers ambulances={[ambulance]} assignedId={ambulance.id} />}
        </LeafletMap>
      </div>

      {/* Tracking Panel */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 1000,
        width: 'min(340px, calc(100vw - 32px))',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* Header card */}
        <div style={{
          background: 'var(--bg-card)',
          border: `1px solid ${ambulance ? theme.border : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '16px 18px',
          backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-card)',
          transition: 'border-color 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>🚨</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Live Tracking
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className={connected ? 'pulseDot' : 'pulseDot pulseDotRed'} style={{ width: 7, height: 7 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: connected ? '#86efac' : '#fca5a5' }}>
                {connected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 12,
              fontSize: 12, fontWeight: 600, color: '#fca5a5', display: 'flex', gap: 6,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Status badge */}
          {ambulance && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              padding: '10px 14px', borderRadius: 10,
              background: theme.bg, border: `1px solid ${theme.border}`,
            }}>
              <span style={{ fontSize: 18 }}>{theme.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Ambulance Status</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: theme.color }}>{ambulance.status || 'Dispatched'}</div>
              </div>
            </div>
          )}

          {/* Phase banner */}
          {phase ? (
            <div style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: phase === 'TO_HOSPITAL' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.10)',
              border: phase === 'TO_HOSPITAL' ? '1px solid rgba(34,197,94,0.28)' : '1px solid rgba(59,130,246,0.28)',
              marginBottom: 10,
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.45px',
            }}>
              {phase === 'TO_PATIENT' ? 'Heading to patient' : 'Transporting to hospital'}
              {phase === 'TO_HOSPITAL' && hospital?.label ? `: ${hospital.label}` : ''}
            </div>
          ) : null}

          {/* Green corridor control */}
          {(phase === 'TO_PATIENT' || phase === 'TO_HOSPITAL') && auth?.token ? (
            <button
              className="buttonGreen"
              style={{ width: '100%', padding: '10px 14px', opacity: greenCorridorEnabled ? 1 : 0.95 }}
              onClick={toggleGreenCorridor}
              disabled={greenCorridorEnabled && corridorEdgeKeys.length === 0}
            >
              {greenCorridorEnabled ? 'Green Corridor Active' : 'Activate Green Corridor'}
            </button>
          ) : null}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'ETA', value: formatEta(etaSeconds), icon: '⏱' },
              { label: 'Distance', value: distanceKm != null ? `${distanceKm.toFixed(1)}km` : '—', icon: '📏' },
              { label: 'Elapsed', value: `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`, icon: '🕐' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{
                padding: '10px 8px', borderRadius: 8, textAlign: 'center',
                background: 'rgba(6,11,22,0.4)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 14, marginBottom: 3 }}>{icon}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {ambulance && (
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(6,11,22,0.4)', border: '1px solid var(--border)',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>🚑</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Assigned Unit</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ambulance.label || 'Ambulance'}</div>
              </div>
            </div>
          )}

          <button className="buttonSecondary" style={{ width: '100%', justifyContent: 'center', padding: '9px 14px' }} onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>

          {routeSnapshot?.route?.optimal && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              🧠 Route computed with time-weighted A* and live traffic rerouting.
            </div>
          )}
        </div>

        {/* Route alternatives */}
        {routeSnapshot?.route?.alternatives?.length > 0 && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '14px 16px',
            backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Alternative Routes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {routeSnapshot.route.alternatives.slice(0, 3).map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(6,11,22,0.4)', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Route {i + 2}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{formatEta(r.totalTimeSeconds)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2000, width: 'min(340px, calc(100vw - 32px))', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n) => (
            <div key={n.id} style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
              color: '#86efac', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 20px rgba(34,197,94,0.15)',
              animation: 'slideInRight 0.3s ease',
            }}>
              <span>🔔</span> {n.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
