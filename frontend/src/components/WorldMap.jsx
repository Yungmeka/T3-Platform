import { useState, useEffect, useRef } from 'react';
import COUNTRIES from './countriesData';

const W = 1000, H = 500;
const px = (lng) => ((lng + 180) / 360) * W;
const py = (lat) => ((90 - lat) / 180) * H;

// Static hub cities — always visible
const CITIES = [
  { lat: 37.78, lng: -122.42, label: 'San Francisco', queries: '2.4k' },
  { lat: 51.51, lng: -0.13, label: 'London', queries: '1.8k' },
  { lat: 35.68, lng: 139.69, label: 'Tokyo', queries: '3.1k' },
  { lat: -33.87, lng: 151.21, label: 'Sydney', queries: '0.9k' },
  { lat: 1.35, lng: 103.82, label: 'Singapore', queries: '2.0k' },
  { lat: 55.76, lng: 37.62, label: 'Moscow', queries: '0.5k' },
  { lat: -23.55, lng: -46.63, label: 'São Paulo', queries: '1.5k' },
  { lat: 19.43, lng: -99.13, label: 'Mexico City', queries: '0.7k' },
  { lat: 28.61, lng: 77.21, label: 'Delhi', queries: '1.2k' },
  { lat: 36.19, lng: 44.01, label: 'Erbil', queries: '0.3k' },
];

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 8], [0, 6], [4, 3], [8, 9], [1, 5],
];

// Live query event locations — people querying AI around the world
const QUERY_LOCATIONS = [
  { lat: 40.71, lng: -74.01 },   // New York
  { lat: 34.05, lng: -118.24 },  // LA
  { lat: 41.88, lng: -87.63 },   // Chicago
  { lat: 48.86, lng: 2.35 },     // Paris
  { lat: 52.52, lng: 13.41 },    // Berlin
  { lat: 39.90, lng: 116.41 },   // Beijing
  { lat: 31.23, lng: 121.47 },   // Shanghai
  { lat: -6.21, lng: 106.85 },   // Jakarta
  { lat: 37.57, lng: 126.98 },   // Seoul
  { lat: 13.76, lng: 100.50 },   // Bangkok
  { lat: -1.29, lng: 36.82 },    // Nairobi
  { lat: 6.52, lng: 3.38 },      // Lagos
  { lat: 30.04, lng: 31.24 },    // Cairo
  { lat: 25.20, lng: 55.27 },    // Dubai
  { lat: 41.01, lng: 28.98 },    // Istanbul
  { lat: 12.97, lng: 77.59 },    // Bangalore
  { lat: 22.54, lng: 114.06 },   // Shenzhen
  { lat: -34.60, lng: -58.38 },  // Buenos Aires
  { lat: 45.50, lng: -73.57 },   // Montreal
  { lat: 47.61, lng: -122.33 },  // Seattle
  { lat: 25.76, lng: -80.19 },   // Miami
  { lat: 50.08, lng: 14.44 },    // Prague
  { lat: 59.33, lng: 18.07 },    // Stockholm
  { lat: -37.81, lng: 144.96 },  // Melbourne
  { lat: 43.65, lng: -79.38 },   // Toronto
  { lat: 35.18, lng: 129.08 },   // Busan
  { lat: 33.87, lng: 35.51 },    // Beirut
  { lat: 14.60, lng: 120.98 },   // Manila
  { lat: 3.14, lng: 101.69 },    // Kuala Lumpur
  { lat: -22.91, lng: -43.17 },  // Rio
];

// AI information sources — where AI platforms pull data from
const INFO_SOURCES = [
  { lat: 37.39, lng: -122.08, label: 'Google AI', type: 'search' },
  { lat: 47.64, lng: -122.13, label: 'OpenAI', type: 'llm' },
  { lat: 37.48, lng: -122.15, label: 'Meta AI', type: 'social' },
  { lat: 37.33, lng: -121.89, label: 'Anthropic', type: 'llm' },
  { lat: 51.50, lng: -0.12, label: 'DeepMind', type: 'llm' },
  { lat: 49.28, lng: -123.12, label: 'Cohere', type: 'llm' },
  { lat: 48.14, lng: 11.58, label: 'Aleph Alpha', type: 'llm' },
  { lat: 31.23, lng: 121.47, label: 'Baidu AI', type: 'search' },
  { lat: 35.68, lng: 139.69, label: 'Perplexity JP', type: 'search' },
  { lat: 1.35, lng: 103.82, label: 'SEA Hub', type: 'search' },
];

// Generate a random live event
function spawnEvent(locations) {
  const loc = locations[Math.floor(Math.random() * locations.length)];
  const jitterLat = (Math.random() - 0.5) * 6;
  const jitterLng = (Math.random() - 0.5) * 8;
  return {
    id: Math.random(),
    x: px(loc.lng + jitterLng),
    y: py(loc.lat + jitterLat),
    born: Date.now(),
    life: 2000 + Math.random() * 2000,
  };
}

export default function WorldMap({ onRegionClick, selectedRegion, className = '' }) {
  const [hovered, setHovered] = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);
  const intervalRef = useRef(null);

  // Spawn live query events periodically
  useEffect(() => {
    // Seed initial events
    const initial = [];
    for (let i = 0; i < 8; i++) {
      const e = spawnEvent(QUERY_LOCATIONS);
      e.born = Date.now() - Math.random() * 2000;
      initial.push(e);
    }
    setLiveEvents(initial);

    intervalRef.current = setInterval(() => {
      setLiveEvents(prev => {
        const now = Date.now();
        // Remove expired, add new
        const alive = prev.filter(e => now - e.born < e.life);
        // Spawn 1-2 new events
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          alive.push(spawnEvent(QUERY_LOCATIONS));
        }
        // Cap at 15
        return alive.slice(-15);
      });
    }, 800);

    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <svg viewBox="0 0 1000 500" className={`w-full h-auto ${className}`}>
      <defs>
        <linearGradient id="wmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0.06" />
        </linearGradient>
        <filter id="wmGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Live query ping animation */}
        <radialGradient id="pingGrad">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
        </radialGradient>
        {/* Info source glow */}
        <radialGradient id="infoGrad">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="500" fill="url(#wmGrad)" rx="8" />

      {/* Grid lines */}
      {[-60, -30, 0, 30, 60].map(lat => (
        <line key={`lat${lat}`} x1="0" y1={py(lat)} x2="1000" y2={py(lat)} stroke="#7C3AED" strokeOpacity="0.06" strokeWidth="0.5" strokeDasharray="4 8" />
      ))}
      {[-120, -60, 0, 60, 120].map(lng => (
        <line key={`lng${lng}`} x1={px(lng)} y1="0" x2={px(lng)} y2="500" stroke="#7C3AED" strokeOpacity="0.06" strokeWidth="0.5" strokeDasharray="4 8" />
      ))}

      {/* Real country shapes */}
      {COUNTRIES.map(c => {
        const isSelected = selectedRegion === c.n;
        const isHovered = hovered === c.id;
        return (
          <path
            key={c.id}
            d={c.d}
            fill={isSelected ? '#7C3AED' : '#6D28D9'}
            fillOpacity={isSelected ? 0.55 : isHovered ? 0.4 : 0.3}
            stroke={isSelected ? '#EC4899' : '#7C3AED'}
            strokeOpacity={isSelected ? 0.9 : 0.5}
            strokeWidth={isSelected ? 1.5 : 0.7}
            filter={isSelected ? 'url(#wmGlow)' : undefined}
            style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s, stroke-opacity 0.2s' }}
            onMouseEnter={() => setHovered(c.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onRegionClick?.({ name: c.n, lat: c.lat, lng: c.lng })}
          >
            <title>{c.n}</title>
          </path>
        );
      })}

      {/* Connection lines */}
      {CONNECTIONS.map(([i, j], idx) => {
        const a = CITIES[i], b = CITIES[j];
        return (
          <line key={idx} x1={px(a.lng)} y1={py(a.lat)} x2={px(b.lng)} y2={py(b.lat)}
            stroke="#7C3AED" strokeOpacity="0.15" strokeWidth="0.8" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" values="0;8" dur="3s" repeatCount="indefinite" />
          </line>
        );
      })}

      {/* ─── LIVE QUERY EVENTS — pink pings popping around the world ─── */}
      {liveEvents.map(ev => (
        <g key={ev.id}>
          {/* Expanding ring */}
          <circle cx={ev.x} cy={ev.y} r="2" fill="none" stroke="#EC4899" strokeWidth="1">
            <animate attributeName="r" from="2" to="16" dur={`${ev.life}ms`} fill="freeze" />
            <animate attributeName="stroke-opacity" from="0.6" to="0" dur={`${ev.life}ms`} fill="freeze" />
          </circle>
          {/* Core dot */}
          <circle cx={ev.x} cy={ev.y} r="2" fill="#EC4899">
            <animate attributeName="opacity" from="1" to="0" dur={`${ev.life}ms`} fill="freeze" />
          </circle>
          {/* Tiny glow */}
          <circle cx={ev.x} cy={ev.y} r="5" fill="url(#pingGrad)">
            <animate attributeName="opacity" from="0.6" to="0" dur={`${ev.life}ms`} fill="freeze" />
          </circle>
        </g>
      ))}

      {/* ─── AI INFO SOURCES — blue diamond markers ─── */}
      {INFO_SOURCES.map((src, i) => {
        const x = px(src.lng);
        const y = py(src.lat);
        return (
          <g key={src.label}>
            {/* Rotating glow ring */}
            <circle cx={x} cy={y} r="10" fill="none" stroke="#38BDF8" strokeOpacity="0.15" strokeWidth="0.8">
              <animate attributeName="r" values="10;15;10" dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.15;0.06;0.15" dur={`${3 + i * 0.4}s`} repeatCount="indefinite" />
            </circle>
            {/* Outer glow */}
            <circle cx={x} cy={y} r="6" fill="url(#infoGrad)" opacity="0.4" />
            {/* Diamond shape */}
            <polygon
              points={`${x},${y-4} ${x+3},${y} ${x},${y+4} ${x-3},${y}`}
              fill="#38BDF8"
              stroke="#1E3A5F"
              strokeWidth="0.5"
              strokeOpacity="0.3"
            />
            {/* Label */}
            <text x={x + 8} y={y - 3} fontSize="8" fill="#0EA5E9" fontFamily="DM Sans" fontWeight="700">{src.label}</text>
            <text x={x + 8} y={y + 6} fontSize="7" fill="#64748B" fontFamily="DM Sans" fontWeight="600">
              {src.type === 'llm' ? 'LLM Provider' : src.type === 'search' ? 'AI Search' : 'Social AI'}
            </text>
          </g>
        );
      })}

      {/* ─── CITY HUBS — purple markers with query counts ─── */}
      {CITIES.map((city, i) => (
        <g key={city.label}>
          <circle cx={px(city.lng)} cy={py(city.lat)} r="8" fill="#7C3AED" fillOpacity="0.12">
            <animate attributeName="r" values="8;13;8" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.12;0.04;0.12" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={px(city.lng)} cy={py(city.lat)} r="3.5" fill="#EC4899" />
          <text x={px(city.lng) + 8} y={py(city.lat) - 5} fontSize="9" fill="#334155" fontFamily="DM Sans" fontWeight="600">{city.label}</text>
          <text x={px(city.lng) + 8} y={py(city.lat) + 5} fontSize="8" fill="#7C3AED" fontFamily="DM Sans" fontWeight="700">{city.queries} queries</text>
        </g>
      ))}

      {/* Legend — clear box */}
      <g transform="translate(12, 448)">
        <rect x="-4" y="-12" width="340" height="28" rx="6" fill="white" fillOpacity="0.85" stroke="#E2E8F0" strokeWidth="0.5" />
        {/* Live query */}
        <circle cx="8" cy="2" r="4" fill="#EC4899" />
        <circle cx="8" cy="2" r="7" fill="none" stroke="#EC4899" strokeOpacity="0.4" strokeWidth="0.8" />
        <text x="20" y="5" fontSize="9" fill="#334155" fontFamily="DM Sans" fontWeight="600">Live AI Query</text>
        {/* Info source */}
        <polygon points="120,-2 124,2 120,6 116,2" fill="#38BDF8" />
        <text x="130" y="5" fontSize="9" fill="#334155" fontFamily="DM Sans" fontWeight="600">AI Data Source</text>
        {/* Hub */}
        <circle cx="240" cy="2" r="4" fill="#7C3AED" />
        <text x="250" y="5" fontSize="9" fill="#334155" fontFamily="DM Sans" fontWeight="600">Monitoring Hub</text>
      </g>
    </svg>
  );
}
