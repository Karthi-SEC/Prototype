import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function RouteFitBounds({ graph, routeNodes }) {
  const map = useMap()

  useEffect(() => {
    if (!routeNodes || routeNodes.length < 2) return
    const latLngs = routeNodes.map((id) => {
      const n = graph.nodesById[id]
      return [n.lat, n.lon]
    })
    const bounds = L.latLngBounds(latLngs)
    map.fitBounds(bounds, { padding: [36, 36] })
  }, [map, graph, routeNodes])

  return null
}

export default function LeafletMap({ graph, routeNodes, children }) {
  const center = useMemo(() => {
    const b = graph.bbox
    return [(b.south + b.north) / 2, (b.west + b.east) / 2]
  }, [graph])

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
      />

      <RouteFitBounds graph={graph} routeNodes={routeNodes} />
      {children}
    </MapContainer>
  )
}

