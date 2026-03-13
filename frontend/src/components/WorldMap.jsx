import { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const CITIES = [
  { name: 'New York',       coords: [-74.006,   40.7128] },
  { name: 'London',         coords: [-0.1276,   51.5074] },
  { name: 'Tokyo',          coords: [139.6917,  35.6895] },
  { name: 'Sydney',         coords: [151.2093, -33.8688] },
  { name: 'São Paulo',      coords: [-46.6333, -23.5505] },
  { name: 'Dubai',          coords: [55.2708,   25.2048] },
  { name: 'Singapore',      coords: [103.8198,   1.3521] },
  { name: 'Lagos',          coords: [3.3792,     6.5244] },
  { name: 'Mumbai',         coords: [72.8777,   19.076 ] },
  { name: 'San Francisco',  coords: [-122.4194, 37.7749] },
]

export default function WorldMap({ height = 360 }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % CITIES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height }} className="overflow-hidden">

      {/* Map */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120, center: [10, 20] }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: {
                    fill:    '#E8E0F0',
                    stroke:  '#D4C8E8',
                    strokeWidth: 0.5,
                    outline: 'none',
                  },
                  hover: {
                    fill:    '#E8E0F0',
                    stroke:  '#D4C8E8',
                    strokeWidth: 0.5,
                    outline: 'none',
                  },
                  pressed: {
                    fill:    '#E8E0F0',
                    stroke:  '#D4C8E8',
                    strokeWidth: 0.5,
                    outline: 'none',
                  },
                }}
              />
            ))
          }
        </Geographies>

        {CITIES.map((city, index) => {
          const isActive = index === activeIndex
          return (
            <Marker key={city.name} coordinates={city.coords}>
              {/* Pulse ring — only on active dot */}
              {isActive && (
                <circle
                  r={4}
                  fill="#7C3AED"
                  opacity={0.6}
                  className="map-pulse"
                  style={{ transformOrigin: '0 0' }}
                />
              )}
              {/* Solid dot */}
              <circle
                r={isActive ? 6 : 4}
                fill={isActive ? '#6D28D9' : '#7C3AED'}
                style={{
                  transition: 'r 0.3s ease, fill 0.3s ease',
                  filter: isActive
                    ? 'drop-shadow(0 0 4px rgba(124, 58, 237, 0.7))'
                    : 'none',
                }}
              />
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Legend badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.92)',
          border: '1px solid #DDD6FE',
          borderRadius: 999,
          padding: '4px 10px 4px 8px',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.12)',
        }}
      >
        <span
          className="pulse-dot"
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#7C3AED',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#7C3AED',
            fontFamily: 'DM Sans, sans-serif',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          Live AI Queries
        </span>
      </div>

    </div>
  )
}
