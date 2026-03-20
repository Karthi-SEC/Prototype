export default function TripControls({
  destinations,
  ambulances,
  autoAssign,
  onToggleAutoAssign,
  selectedAmbulanceId,
  onSelectAmbulance,
  selectedDestinationId,
  onSelectDestination,
  dispatchActive,
  onDispatch,
  onActivateGreenCorridor,
  onCancelDispatch,
  greenCorridorActive,
}) {
  const idleCount = ambulances.filter((a) => a.status === 'Idle').length

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 18px',
      backdropFilter: 'blur(20px)',
      boxShadow: 'var(--shadow-card)',
      color: 'var(--text-primary)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🎛</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Dispatch Controls
          </div>
        </div>
        <div style={{
          padding: '3px 10px', borderRadius: 999,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          fontSize: 11, fontWeight: 700, color: '#86efac',
        }}>
          {idleCount} idle
        </div>
      </div>

      {/* Auto-assign toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderRadius: 10,
        background: 'rgba(6,11,22,0.4)', border: '1px solid var(--border)',
        marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Auto-Assign</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            {autoAssign ? 'Nearest available unit selected' : 'Manual unit selection'}
          </div>
        </div>
        <div
          className={`switch switchButton ${autoAssign ? 'switchOn' : ''}`}
          onClick={() => onToggleAutoAssign(!autoAssign)}
          role="switch"
          aria-checked={autoAssign}
        >
          <div className="switchInner" />
        </div>
      </div>

      {/* Selects */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>
            Ambulance Unit
          </div>
          <select
            className="control"
            value={selectedAmbulanceId}
            disabled={autoAssign || dispatchActive}
            onChange={(e) => onSelectAmbulance(e.target.value)}
          >
            {ambulances.map((a) => (
              <option key={a.id} value={a.id}>
                🚑 {a.label} — {a.status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 5 }}>
            Destination
          </div>
          <select
            className="control"
            value={selectedDestinationId}
            disabled={dispatchActive}
            onChange={(e) => onSelectDestination(e.target.value)}
          >
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.kind === 'Hospital' ? '🏥' : '📍'} {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="button"
          disabled={dispatchActive}
          onClick={onDispatch}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '11px 16px',
            fontSize: 14,
            background: dispatchActive ? 'rgba(59,130,246,0.2)' : 'var(--accent-blue)',
            boxShadow: dispatchActive ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
          }}
        >
          {dispatchActive ? (
            <>
              <div className="pulseDot" style={{ width: 8, height: 8 }} />
              Dispatch Active
            </>
          ) : (
            <>🚀 Dispatch & Optimize</>
          )}
        </button>

        <button
          className="buttonGreen"
          disabled={!dispatchActive || greenCorridorActive}
          onClick={onActivateGreenCorridor}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '10px 16px',
            fontSize: 13,
          }}
        >
          {greenCorridorActive ? (
            <>
              <div className="pulseDot" style={{ width: 7, height: 7 }} />
              Green Corridor Active
            </>
          ) : (
            <>🟢 Activate Green Corridor</>
          )}
        </button>

        <button
          className="buttonSecondary"
          disabled={!dispatchActive}
          onClick={onCancelDispatch}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '10px 16px',
            fontSize: 13,
          }}
        >
          🚫 Cancel Dispatch
        </button>
      </div>

      {/* Status hint */}
      <div style={{
        marginTop: 12, padding: '8px 10px', borderRadius: 8,
        background: 'rgba(6,11,22,0.35)', border: '1px solid var(--border)',
        fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
      }}>
        {dispatchActive
          ? '⚡ Traffic updates every 3s · Routes recompute every 5s'
          : '📍 1) Choose a destination 2) Confirm dispatch 3) Watch live ambulance tracking'}
      </div>
    </div>
  )
}
