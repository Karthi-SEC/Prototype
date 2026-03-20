import { useEffect, useRef, useState } from 'react'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-api-script'

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window object is undefined'))
      return
    }

    if (window.google && window.google.maps) {
      resolve(window.google.maps)
      return
    }

    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps))
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')))
      return
    }

    if (!apiKey) {
      reject(new Error('Google Maps API key is required: set VITE_GOOGLE_MAPS_API_KEY'))
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps)
      } else {
        reject(new Error('Google Maps loaded but window.google.maps is missing'))
      }
    }

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
  })
}

function setOrUpdateMarker(map, markerRef, position, options) {
  if (!position) {
    if (markerRef.current) {
      markerRef.current.setMap(null)
      markerRef.current = null
    }
    return
  }

  const center = { lat: position.lat, lng: position.lon }
  if (!markerRef.current) {
    markerRef.current = new window.google.maps.Marker({
      position: center,
      map,
      ...options,
    })
  } else {
    markerRef.current.setPosition(center)
    if (options?.icon) markerRef.current.setIcon(options.icon)
    if (options?.title) markerRef.current.setTitle(options.title)
  }
}

function createPolyline(map, path, style = {}) {
  if (!path || path.length < 2) return null
  return new window.google.maps.Polyline({
    path,
    strokeColor: style.strokeColor ?? '#00e5ff',
    strokeOpacity: style.strokeOpacity ?? 0.85,
    strokeWeight: style.strokeWeight ?? 6,
    map,
  })
}

export default function GoogleMapView({ userPosition, ambulance, hospital, routeNodes, graph }) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const userMarkerRef = useRef(null)
  const ambulanceMarkerRef = useRef(null)
  const hospitalMarkerRef = useRef(null)
  const routePolylineRef = useRef(null)
  const directionsRendererRef = useRef(null)
  const [mapError, setMapError] = useState(null)

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    let active = true

    loadGoogleMapsScript(mapsApiKey)
      .then(() => {
        if (!active || mapRef.current || !mapContainer.current) return
        const center = userPosition
          ? { lat: userPosition.lat, lng: userPosition.lon }
          : ambulance
          ? { lat: ambulance.position.lat, lng: ambulance.position.lon }
          : hospital
          ? { lat: hospital.lat, lng: hospital.lon }
          : { lat: 40.7128, lng: -74.0060 }

        mapRef.current = new window.google.maps.Map(mapContainer.current, {
          center,
          zoom: 13,
          mapTypeId: 'roadmap',
          disableDefaultUI: false,
        })

        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: { strokeColor: '#22d3ee', strokeWeight: 6, strokeOpacity: 0.92 },
        })
        directionsRendererRef.current.setMap(mapRef.current)
      })
      .catch((err) => {
        console.error('GoogleMapView load error:', err)
        setMapError(err.message)
      })

    return () => {
      active = false
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null)
        routePolylineRef.current = null
      }
      if (userMarkerRef.current) userMarkerRef.current.setMap(null)
      if (ambulanceMarkerRef.current) ambulanceMarkerRef.current.setMap(null)
      if (hospitalMarkerRef.current) hospitalMarkerRef.current.setMap(null)
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null)
    }
  }, [mapsApiKey, userPosition, ambulance, hospital])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.google || !window.google.maps) return

    setOrUpdateMarker(map, userMarkerRef, userPosition, {
      title: 'Your location',
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#22c55e', fillOpacity: 0.95, strokeColor: '#ffffff', strokeWeight: 2 },
    })

    setOrUpdateMarker(map, ambulanceMarkerRef, ambulance?.position, {
      title: ambulance?.label ?? 'Ambulance',
      icon: {
        path: 'M -12,-6 0,0 0,6 12,6 0,0 0,-6 z',
        fillColor: '#f59e0b',
        fillOpacity: 0.95,
        strokeColor: '#bb4a03',
        strokeWeight: 2,
        scale: 1,
      },
    })

    setOrUpdateMarker(map, hospitalMarkerRef, hospital, {
      title: hospital?.label ?? 'Hospital',
      icon: 'https://maps.google.com/mapfiles/ms/icons/hospitals.png',
    })

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null)
      routePolylineRef.current = null
    }

    const routePoints = []
    if (routeNodes?.length && graph) {
      for (const nodeId of routeNodes) {
        const node = graph.nodesById[nodeId]
        if (node) routePoints.push({ lat: node.lat, lng: node.lon })
      }
    }

    if (routePoints.length >= 2) {
      routePolylineRef.current = createPolyline(map, routePoints, {
        strokeColor: '#22c55e',
        strokeWeight: 5,
        strokeOpacity: 0.85,
      })
      const bounds = new window.google.maps.LatLngBounds()
      routePoints.forEach((p) => bounds.extend(p))
      if (userPosition) bounds.extend({ lat: userPosition.lat, lng: userPosition.lon })
      if (ambulance?.position) bounds.extend({ lat: ambulance.position.lat, lng: ambulance.position.lon })
      if (hospital) bounds.extend({ lat: hospital.lat, lng: hospital.lon })
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
    } else {
      if (ambulance?.position) {
        map.panTo({ lat: ambulance.position.lat, lng: ambulance.position.lon })
        map.setZoom(14)
      }
    }

    // Directions fallback for user -> ambulance -> hospital chain, similar to Google Maps direction view.
    const placeA = ambulance?.position
    const placeB = userPosition
    const placeC = hospital

    if (placeA && placeB && window.google && window.google.maps) {
      const directionsService = new window.google.maps.DirectionsService()
      directionsService.route(
        {
          origin: { lat: placeA.lat, lng: placeA.lon },
          destination: { lat: placeB.lat, lng: placeB.lon },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result)
          } else {
            console.debug('Google directions not available:', status)
          }
        },
      )
    } else if (placeB && placeC && window.google && window.google.maps) {
      const directionsService = new window.google.maps.DirectionsService()
      directionsService.route(
        {
          origin: { lat: placeB.lat, lng: placeB.lon },
          destination: { lat: placeC.lat, lng: placeC.lon },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result)
          }
        },
      )
    }
  }, [userPosition, ambulance, hospital, routeNodes, graph])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {mapError && (
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 20, color: '#e11d48', background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(226, 94, 194, 0.4)' }}>
          Google Maps error: {mapError}
        </div>
      )}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
