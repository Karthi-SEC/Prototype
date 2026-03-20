import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from '../AppRouter'
import { useNavigate } from 'react-router-dom'

function formatShortStatus(status) {
  if (!status) return '—'
  const map = { pending: 'Pending', dispatched: 'Dispatched', arrived: 'Arrived', completed: 'Completed', cancelled: 'Cancelled' }
  return map[String(status).toLowerCase()] ?? String(status)
}

function statusColor(status) {
  const s = String(status).toLowerCase()
  if (s === 'completed' || s === 'arrived') return { color: '#86efac', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' }
  if (s === 'dispatched') return { color: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' }
  if (s === 'cancelled') return { color: '#fca5a5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' }
  return { color: '#fcd34d', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' }
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'rgba(6,11,22,0.5)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'border-color 0.2s',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE || 'http://localhost:4000', [])

  const [contacts, setContacts] = useState([])
  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [geoError, setGeoError] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [dispatching, setDispatching] = useState(false)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const sosTimerRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const fetchDashboard = async () => {
    const headers = auth.authHeaders
    const [cRes, rRes] = await Promise.all([
      fetch(`${apiBase}/api/users/me/contacts`, { headers }),
      fetch(`${apiBase}/api/users/me/requests`, { headers }),
    ])
    if (cRes.ok) setContacts((await cRes.json()).contacts ?? [])
    if (rRes.ok) setRequests((await rRes.json()).requests ?? [])

    const nRes = await fetch(`${apiBase}/api/users/me/notifications`, { headers })
    if (nRes.ok) setNotifications((await nRes.json()).notifications ?? [])
  }

  const fetchHospitals = async (lat, lon) => {
    const res = await fetch(`${apiBase}/api/hospitals/nearby?lat=${lat}&lon=${lon}`)
    if (!res.ok) return
    const data = await res.json()
    setHospitals(data.hospitals ?? [])
  }

  useEffect(() => {
    fetchDashboard().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!navigator.geolocation) { setGeoError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (!cancelled) fetchHospitals(pos.coords.latitude, pos.coords.longitude).catch(() => {}) },
      (err) => { if (!cancelled) setGeoError(err?.message || 'Location denied') },
      { enableHighAccuracy: true, timeout: 8000 },
    )
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported'))
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(new Error(err?.message || 'Failed to get location')),
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })

  const startSosFlow = () => {
    if (dispatching) return
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser')
      return
    }

    setDispatching(true)

    navigator.geolocation.getCurrentPosition(
      () => {
        setCountdown(5)
        const startAt = Date.now()
        sosTimerRef.current = window.setInterval(() => {
          const remaining = Math.max(0, 5 - Math.floor((Date.now() - startAt) / 1000))
          setCountdown(remaining)
          if (remaining <= 0) {
            window.clearInterval(sosTimerRef.current)
            sosTimerRef.current = null
            setCountdown(null)
            runDispatch().catch((e) => {
              setError(e?.message || 'Dispatch failed')
              setDispatching(false)
            })
          }
        }, 250)
      },
      (err) => {
        setError(`Location access required for SOS: ${err?.message || 'permission denied'}`)
        setDispatching(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const cancelSosFlow = () => {
    setError(null)
    setCountdown(null)
    setDispatching(false)
    if (sosTimerRef.current) window.clearInterval(sosTimerRef.current)
    sosTimerRef.current = null
  }

  useEffect(() => () => { if (sosTimerRef.current) window.clearInterval(sosTimerRef.current) }, [])

  const runDispatch = async () => {
    const loc = await getLocation()
    const res = await fetch(`${apiBase}/api/sos/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders },
      body: JSON.stringify({ lat: loc.lat, lon: loc.lon }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to request ambulance')
    setDispatching(false)
    navigate(`/tracking/${data.requestId}`)
  }

  const completedCount = requests.filter((r) => ['completed', 'arrived'].includes(String(r.status).toLowerCase())).length
  const activeCount = requests.filter((r) => ['pending', 'dispatched'].includes(String(r.status).toLowerCase())).length
  const activeRequest = requests.find((r) => ['pending', 'dispatched', 'transporting'].includes(String(r.status).toLowerCase()))

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-deep)',
      padding: '0',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Top Nav */}
      <div style={{
        background: 'rgba(10,17,32,0.95)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>🚑</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1 }}>MediRoute</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Emergency Dispatch</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginRight: 8 }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <div className="pulseDot" style={{ width: 6, height: 6 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#86efac' }}>System Online</span>
          </div>
          <button
            className="buttonSecondary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => navigate('/profile')}
          >
            👤 {auth.user?.name?.split(' ')[0] || 'Profile'}
          </button>
          <button
            className="buttonSecondary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={auth.logout}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Welcome row */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Welcome back, {auth.user?.name?.split(' ')[0] || 'Patient'} 👋
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard icon="🚨" label="Total Requests" value={requests.length || '0'} color="#ef4444" />
          <StatCard icon="✅" label="Completed" value={completedCount || '0'} color="#22c55e" />
          <StatCard icon="⚡" label="Active" value={activeCount || '0'} color="#3b82f6" />
          <StatCard icon="👥" label="Contacts" value={contacts.length || '0'} color="#f59e0b" />
        </div>

        {/* Active Emergency */}
        <div style={{
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 12,
        }}>
          {activeRequest ? (
            <div className="panelCard" style={{ borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
              <div className="panelHeader" style={{ marginBottom: 10 }}>
                <div className="panelIcon" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)' }}>🚨</div>
                <div className="panelTitle">Active Emergency</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 16, color: 'var(--text-primary)' }}>Request #{activeRequest.id}</div>
                  <div style={{ marginTop: 4, fontSize: 12, fontWeight: 850, color: 'var(--text-muted)' }}>{activeRequest.destination_label || 'Emergency dispatch'}</div>
                  <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: activeRequest.status === 'Transporting' ? '#22c55e' : '#3b82f6' }} />
                    <span style={{ fontWeight: 950, fontSize: 12, color: 'var(--text-primary)' }}>{activeRequest.status}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="buttonSecondary" onClick={() => navigate(`/tracking/${activeRequest.id}`)} style={{ padding: '10px 14px' }}>
                    Open Live Tracking
                  </button>
                  <button className="buttonGreen" onClick={() => navigate('/profile')} style={{ padding: '10px 14px' }}>
                    Update Contacts
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="panelCard" style={{ borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
              <div className="panelHeader" style={{ marginBottom: 10 }}>
                <div className="panelIcon" style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.25)' }}>🛰️</div>
                <div className="panelTitle">No Active Emergency</div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: 13, lineHeight: 1.5 }}>
                Your nearest ambulance will be dispatched automatically when you press the SOS button. Your live tracking and hospital transfer will appear here.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* SOS Card */}
            <div style={{
              background: dispatching
                ? 'rgba(239,68,68,0.08)'
                : 'var(--bg-card)',
              border: dispatching
                ? '1px solid rgba(239,68,68,0.35)'
                : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              backdropFilter: 'blur(20px)',
              transition: 'all 0.3s',
              boxShadow: dispatching ? '0 0 30px rgba(239,68,68,0.15)' : 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>🆘</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Emergency SOS
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Press SOS to dispatch the nearest available ambulance to your GPS location. A 5-second countdown allows cancellation.
              </div>

              {countdown != null ? (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.12)',
                    border: '3px solid rgba(239,68,68,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontSize: 32, fontWeight: 900, color: '#f87171',
                    boxShadow: '0 0 30px rgba(239,68,68,0.3)',
                    animation: 'pulseRed 1s infinite',
                  }}>
                    {countdown}
                  </div>
                  <div style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>Dispatching in {countdown}s...</div>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={startSosFlow}
                  disabled={dispatching}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: dispatching ? 'rgba(239,68,68,0.2)' : 'var(--accent-red)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: dispatching ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    fontSize: 16,
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: dispatching ? 'none' : '0 4px 20px rgba(239,68,68,0.4)',
                    letterSpacing: '0.5px',
                  }}
                >
                  🚨 SOS — Call Ambulance
                </button>

                {countdown != null && (
                  <button
                    className="buttonSecondary"
                    onClick={cancelSosFlow}
                    style={{ padding: '14px 16px', fontSize: 13 }}
                  >
                    ✕ Cancel ({countdown}s)
                  </button>
                )}
              </div>

              {error && (
                <div className="authError" style={{ marginTop: 12 }}>
                  <span>⚠</span> {error}
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {geoError ? `⚠ ${geoError}` : '📍 GPS location will be used for dispatch'}
                </span>
              </div>
            </div>

            {/* Nearby Hospitals */}
            <div className="panelCard">
              <div className="panelHeader">
                <div className="panelIcon" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>🏥</div>
                <div className="panelTitle">Nearby Hospitals</div>
              </div>
              {!hospitals.length ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                  <div className="spinner" />
                  Locating nearby hospitals...
                </div>
              ) : (
                <div className="miniList">
                  {hospitals.map((h, i) => (
                    <div key={h.id} className="miniItem">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: 'rgba(59,130,246,0.1)',
                          border: '1px solid rgba(59,130,246,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, color: '#93c5fd', flexShrink: 0,
                        }}>{i + 1}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{h.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emergency services available</div>
                        </div>
                      </div>
                      <div style={{
                        padding: '3px 10px', borderRadius: 999,
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                        fontSize: 12, fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap',
                      }}>
                        {(h.distanceMeters / 1000).toFixed(1)} km
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Emergency History */}
            <div className="panelCard">
              <div className="panelHeader">
                <div className="panelIcon" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>📋</div>
                <div className="panelTitle">Emergency History</div>
              </div>
              <div className="miniList">
                {requests.slice(0, 6).map((r) => {
                  const sc = statusColor(r.status)
                  return (
                    <div key={r.id} className="miniItem" style={{ cursor: 'pointer' }} onClick={() => navigate(`/tracking/${r.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                        }}>🚑</div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>Request #{r.id}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.destination_label || 'Emergency dispatch'}</div>
                        </div>
                      </div>
                      <div style={{
                        padding: '3px 10px', borderRadius: 999,
                        background: sc.bg, border: `1px solid ${sc.border}`,
                        fontSize: 11, fontWeight: 700, color: sc.color, whiteSpace: 'nowrap',
                      }}>
                        {formatShortStatus(r.status)}
                      </div>
                    </div>
                  )
                })}
                {!requests.length && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                    No emergency history yet
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="panelCard">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="panelHeader" style={{ marginBottom: 0 }}>
                  <div className="panelIcon" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>👥</div>
                  <div className="panelTitle">Emergency Contacts</div>
                </div>
                <button className="buttonSecondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => navigate('/profile')}>
                  + Add
                </button>
              </div>
              <div className="miniList">
                {contacts.slice(0, 4).map((c) => (
                  <div key={c.id} className="miniItem">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: c.is_primary ? 'rgba(34,197,94,0.12)' : 'rgba(99,130,190,0.1)',
                        border: c.is_primary ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                      }}>👤</div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {c.name}
                          {c.is_primary ? <span style={{ fontSize: 10, fontWeight: 700, color: '#86efac', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', padding: '1px 6px', borderRadius: 999 }}>PRIMARY</span> : null}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone} · {c.relationship || 'Contact'}</div>
                      </div>
                    </div>
                    <a href={`tel:${c.phone}`} style={{
                      padding: '5px 10px', borderRadius: 6,
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                      fontSize: 11, fontWeight: 700, color: '#86efac', textDecoration: 'none',
                    }}>📞 Call</a>
                  </div>
                ))}
                {!contacts.length && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>👥</div>
                    <div>Add emergency contacts in <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>Profile</button></div>
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="panelCard">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="panelHeader" style={{ marginBottom: 0 }}>
                  <div className="panelIcon" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>🔔</div>
                  <div className="panelTitle">Notifications</div>
                </div>
                <button className="buttonSecondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => fetchDashboard()}>
                  Refresh
                </button>
              </div>
              <div className="miniList">
                {(notifications ?? []).slice(0, 6).map((n) => (
                  <div key={n.id} className="miniItem">
                    <div>
                      <div style={{ fontWeight: 950, color: 'var(--text-primary)', fontSize: 13 }}>{n.message}</div>
                      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {!n.is_read ? (
                        <button
                          className="buttonSecondary"
                          style={{ padding: '6px 10px', fontSize: 11 }}
                          onClick={async () => {
                            await fetch(`${apiBase}/api/users/me/notifications/${n.id}/read`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', ...auth.authHeaders },
                            })
                            fetchDashboard().catch(() => {})
                          }}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {(!notifications || !notifications.length) && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13, fontWeight: 800 }}>
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
