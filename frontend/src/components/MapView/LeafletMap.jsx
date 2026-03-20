import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function RouteFitBounds({ graph, routeNodes, activeAmbulance }) {
  const map = useMap()

  useEffect(() => {
    if (activeAmbulance) {
      // Follow ambulance in real-time
      const pos = [activeAmbulance.position.lat, activeAmbulance.position.lon]
      map.flyTo(pos, 17, { duration: 0.5, easeLinearity: 0.5 })
    } else if (routeNodes && routeNodes.length >= 2) {
      const latLngs = routeNodes.map((id) => {
        const n = graph.nodesById[id]
        return [n.lat, n.lon]
      })
      const bounds = L.latLngBounds(latLngs)
      map.fitBounds(bounds, { padding: [50, 50], animate: true })
    }
  }, [map, graph, routeNodes, activeAmbulance])

  return null
}

export default function LeafletMap({ graph, routeNodes, activeAmbulance, children }) {
  const center = useMemo(() => {
    if (activeAmbulance) {
      return [activeAmbulance.position.lat, activeAmbulance.position.lon]
    }
    const b = graph.bbox
    return [(b.south + b.north) / 2, (b.west + b.east) / 2]
  }, [graph, activeAmbulance])

  return (
    <MapContainer
      center={center}
      zoom={activeAmbulance ? 17 : 13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      zoomAnimation={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
      />

      <RouteFitBounds graph={graph} routeNodes={routeNodes} activeAmbulance={activeAmbulance} />
      {children}
    </MapContainer>
  )
}

