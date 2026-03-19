import { CircleMarker, Tooltip } from 'react-leaflet'

export default function UserLocationMarker({ position }) {
  if (!position) return null
  return (
    <CircleMarker
      center={[position.lat, position.lon]}
      radius={10}
      pathOptions={{
        color: '#ef4444',
        weight: 3,
        fillColor: '#ef4444',
        fillOpacity: 0.7,
      }}
    >
      <Tooltip direction="top" offset={[0, -12]} opacity={1} permanent={false}>
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>📍</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#f0f4ff' }}>Your Location</span>
          </div>
          <div style={{ fontSize: 11, color: '#8b9dc3', marginTop: 2 }}>Emergency pickup point</div>
        </div>
      </Tooltip>
    </CircleMarker>
  )
}
