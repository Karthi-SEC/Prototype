import { Polyline, CircleMarker } from 'react-leaflet'
import { useEffect, useState } from 'react'

export default function AmbulanceTrail({ ambulanceId, ambulancePosition, isActive }) {
  const [trail, setTrail] = useState([])

  useEffect(() => {
    if (!isActive || !ambulancePosition) return

    setTrail((prev) => {
      const newTrail = [
        ...prev,
        { lat: ambulancePosition.lat, lon: ambulancePosition.lon, time: Date.now() },
      ]
      // Keep only last 50 points to maintain performance
      return newTrail.slice(-50)
    })
  }, [ambulancePosition, isActive])

  if (!isActive || trail.length < 2) return null

  const trailPositions = trail.map((p) => [p.lat, p.lon])

  return (
    <>
      {/* Trail line */}
      <Polyline
        positions={trailPositions}
        pathOptions={{
          color: '#60a5fa',
          weight: 3,
          opacity: 0.4,
          dashArray: '5,5',
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {/* Starting point marker */}
      {trail.length > 0 && (
        <CircleMarker
          center={[trail[0].lat, trail[0].lon]}
          radius={5}
          pathOptions={{
            color: '#3b82f6',
            weight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.6,
          }}
        />
      )}
    </>
  )
}
