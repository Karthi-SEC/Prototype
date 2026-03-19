import { Polyline } from 'react-leaflet'
import { getTrafficColorForLevel } from '../../ambulanceDemo/traffic/trafficEngine'
import { Fragment } from 'react'

export default function RouteLayer({
  graph,
  routes,
  trafficState,
  greenCorridorActive,
  corridorEdgesSet,
}) {
  const highlightColor = greenCorridorActive ? '#22c55e' : '#00e5ff'

  return (
    <>
      {routes.map((route) => {
        const routePositions = route.nodes.map((id) => {
          const n = graph.nodesById[id]
          return [n.lat, n.lon]
        })

        const isOptimal = !!route.isOptimal

        return (
          <Fragment key={route.id}>
            {/* Traffic-coded segments */}
            {route.edgeKeys.map((ek) => {
              const edge = graph.edgesByKey[ek]
              if (!edge) return null

              const u = graph.nodesById[edge.u]
              const v = graph.nodesById[edge.v]

              const level = trafficState[ek]?.level ?? 'low'
              const color = getTrafficColorForLevel(level)

              return (
                <Polyline
                  key={`${route.id}-${ek}`}
                  positions={[
                    [u.lat, u.lon],
                    [v.lat, v.lon],
                  ]}
                  pathOptions={{
                    color,
                    weight: isOptimal ? 6 : 4,
                    opacity: isOptimal ? 0.92 : 0.6,
                    dashArray: isOptimal ? undefined : '8,8',
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )
            })}

            {/* Bright overlay for optimal route */}
            {isOptimal && routePositions.length >= 2 && (
              <Polyline
                positions={routePositions}
                pathOptions={{
                  color: highlightColor,
                  weight: 8,
                  opacity: 0.95,
                  dashArray: undefined,
                  lineCap: 'round',
                }}
              />
            )}
          </Fragment>
        )
      })}

      {/* Green corridor edge overlay */}
      {greenCorridorActive &&
        Array.from(corridorEdgesSet).map((ek) => {
          const edge = graph.edgesByKey[ek]
          if (!edge) return null
          const u = graph.nodesById[edge.u]
          const v = graph.nodesById[edge.v]
          return (
            <Polyline
              key={`corridor-${ek}`}
              positions={[
                [u.lat, u.lon],
                [v.lat, v.lon],
              ]}
              pathOptions={{
                color: '#16a34a',
                weight: 10,
                opacity: 0.92,
                lineCap: 'round',
              }}
            />
          )
        })}
    </>
  )
}

