import { CircleMarker, Tooltip } from 'react-leaflet'

function statusStyles(status) {
  switch (status) {
    case 'Dispatched': return { color: '#3b82f6', fillColor: '#3b82f6', pulse: true }
    case 'On the way': return { color: '#f59e0b', fillColor: '#f59e0b', pulse: true }
    case 'Arriving': return { color: '#22c55e', fillColor: '#22c55e', pulse: true }
    case 'Arrived': return { color: '#22c55e', fillColor: '#22c55e', pulse: false }
    default: return { color: '#8b9dc3', fillColor: '#8b9dc3', pulse: false }
  }
}

function statusIcon(status) {
  switch (status) {
    case 'Dispatched': return '🚑'
    case 'On the way': return '⚡'
    case 'Arriving': return '📍'
    case 'Arrived': return '✅'
    default: return '🚑'
  }
}

export default function AmbulanceMarkers({ ambulances, assignedId }) {
  return (
    <>
      {ambulances.map((a) => {
        const isAssigned = a.id === assignedId
        const s = statusStyles(a.status)
        return (
          <div key={a.id}>
            {/* Direction arrow indicator for assigned ambulance */}
            {isAssigned && a.status !== 'Idle' && (
              <CircleMarker
                center={[a.position.lat, a.position.lon]}
                radius={16}
                pathOptions={{
                  color: s.color,
                  weight: 1,
                  fillColor: s.color,
                  fillOpacity: 0.08,
                }}
              />
            )}

            {/* Main ambulance marker */}
            <CircleMarker
              center={[a.position.lat, a.position.lon]}
              radius={isAssigned ? 11 : 7}
              pathOptions={{
                color: s.color,
                weight: isAssigned ? 3 : 2,
                fillColor: s.fillColor,
                fillOpacity: isAssigned ? 0.95 : 0.7,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                <div style={{ fontFamily: "'Inter', sans-serif" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 14 }}>{statusIcon(a.status)}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#f0f4ff' }}>{a.label}</span>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: `${s.color}20`,
                    border: `${s.color}40`,
                    fontSize: 11,
                    fontWeight: 700,
                    color: s.color,
                  }}>
                  {a.status || 'Idle'}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>          </div>        )
      })}
    </>
  )
}
