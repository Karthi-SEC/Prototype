function formatEta(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—'
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function trafficTheme(label) {
  switch (label) {
    case 'Low': return { dot: '#22c55e', bg: 'rgba(34,197,94,0.12)', text: '#86efac', border: 'rgba(34,197,94,0.25)' }
    case 'Moderate': return { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#fcd34d', border: 'rgba(245,158,11,0.25)' }
    case 'Heavy': return { dot: '#ef4444', bg: 'rgba(239,68,68,0.12)', text: '#fca5a5', border: 'rgba(239,68,68,0.25)' }
    default: return { dot: '#8b9dc3', bg: 'rgba(99,130,190,0.1)', text: '#8b9dc3', border: 'rgba(99,130,190,0.2)' }
  }
}

function KpiCard({ label, value, icon, active }) {
  return (
    <div style={{
      padding: '12px 10px',
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: 'rgba(6,11,22,0.4)',
      textAlign: 'center',
      transition: 'border-color 0.2s',
      borderColor: active ? 'rgba(59,130,246,0.25)' : undefined,
    }}>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function AltRouteRow({ index, timeSeconds, trafficLabel }) {
  const t = trafficTheme(trafficLabel)
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 12px', borderRadius: 8,
      background: 'rgba(6,11,22,0.35)', border: '1px solid var(--border)',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'rgba(99,130,190,0.1)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)',
        }}>{index}</div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Route {index}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{formatEta(timeSeconds)}</span>
        <span style={{
          padding: '2px 8px', borderRadius: 999,
          background: t.bg, border: `1px solid ${t.border}`,
          fontSize: 10, fontWeight: 700, color: t.text,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, display: 'inline-block' }} />
          {trafficLabel}
        </span>
      </div>
    </div>
  )
}

export default function DashboardPanel({
  dispatchActive,
  assignedLabel,
  assignedStatus,
  etaSeconds,
  distanceKm,
  trafficSummary,
  alternatives,
  optimal,
  greenMsg,
  onDeleteRequest,
  requestLog,
}) {
  const t = trafficTheme(trafficSummary)

  return (
    <>
      {greenMsg && (
        <div className="banner">
          <span style={{ fontSize: 16 }}>🟢</span>
          {greenMsg}
        </div>
      )}

      <div className={`panelCard dashboardCard ${dispatchActive ? 'dispatchGlow' : ''}`}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>📊</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Routing Dashboard
            </div>
          </div>
          {dispatchActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div className="pulseDot" style={{ width: 7, height: 7 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#86efac' }}>Live</span>
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          <KpiCard icon="📏" label="Distance" value={dispatchActive && distanceKm != null ? `${distanceKm.toFixed(1)}km` : '—'} active={dispatchActive} />
          <KpiCard icon="⏱" label="ETA" value={dispatchActive ? formatEta(etaSeconds) : '—'} active={dispatchActive} />
          <div style={{
            padding: '12px 10px', borderRadius: 10,
            border: `1px solid ${dispatchActive ? t.border : 'var(--border)'}`,
            background: dispatchActive ? t.bg : 'rgba(6,11,22,0.4)',
            textAlign: 'center', transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>🚦</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Traffic</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dispatchActive ? t.dot : 'var(--text-muted)', display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: dispatchActive ? t.text : 'var(--text-primary)' }}>
                {dispatchActive ? trafficSummary : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Tracking Stats (Delivery app style) */}
        {dispatchActive && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 14,
            padding: '12px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(59,130,246,0.08) 100%)',
            border: '1px solid rgba(99,130,190,0.2)',
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>⚡ Speed</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#4ade80', marginTop: 4 }}>~45 km/h</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>📍 Distance</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa', marginTop: 4 }}>{distanceKm ? (distanceKm * 0.2).toFixed(1) : '0'}km traveled</div>
            </div>
          </div>
        )}

        {/* Assigned ambulance */}
        {dispatchActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(6,11,22,0.4)', border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
            }}>🚑</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Assigned Unit</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignedLabel}</div>
            </div>
            <div style={{
              padding: '3px 10px', borderRadius: 999,
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
              fontSize: 11, fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap',
            }}>{assignedStatus}</div>
          </div>
        )}

        {/* Alternative routes */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            Alternative Routes
            <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(alternatives ?? []).slice(0, 3).map((r, idx) => (
              <AltRouteRow key={r.id ?? idx} index={idx + 1} timeSeconds={r.totalTimeSeconds} trafficLabel={r.trafficLabel} />
            ))}
            {!alternatives?.length && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
                Dispatch to see route alternatives
              </div>
            )}
          </div>
        </div>

        {optimal && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            🧠 Optimal route via time-weighted A* — not shortest distance.
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 10 }}>
          <span style={{ fontWeight: 700 }}>Request Status:</span> {dispatchActive ? 'Active' : 'Idle'}
          {dispatchActive && <span style={{ marginLeft: 8, color: 'var(--accent-green)' }}>• Live tracking</span>}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { dot: '#22c55e', label: 'Low traffic' },
            { dot: '#f59e0b', label: 'Moderate' },
            { dot: '#ef4444', label: 'Heavy' },
          ].map(({ dot, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 999,
              background: 'rgba(6,11,22,0.4)', border: '1px solid var(--border)',
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block' }} />
              {label}
            </div>
          ))}
        </div>

        <button
          onClick={onDeleteRequest}
          disabled={!dispatchActive && !assignedLabel}
          style={{
            width: '100%',
            marginTop: 8,
            borderRadius: 10,
            border: '1px solid rgba(239,68,68,0.35)',
            background: 'rgba(239,68,68,0.1)',
            color: '#fca5a5',
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🗑 Delete Request
        </button>
        <div style={{ marginTop: 14, borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
            Recent Requests
          </h4>
          <div style={{ maxHeight: 120, overflowY: 'auto', marginTop: 8 }}>
            {Array.isArray(requestLog) && requestLog.length > 0 ? (
              requestLog.slice(-3).reverse().map((r) => (
                <div key={r.requestId} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, background: 'rgba(6,11,22,0.28)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{r.destination}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.requestId} • {r.startedAt}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: r.status === 'Arrived' ? '#34d399' : r.status === 'Canceled' ? '#f87171' : '#fbbf24' }}>{r.status}</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>No recent requests yet.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
