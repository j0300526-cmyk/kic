import { geoNaturalEarth1, geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import countries from 'world-atlas/countries-110m.json'
import type { RiskEvent, RiskEventType } from '../types'

const WIDTH = 960
const HEIGHT = 460
const topology = countries as unknown as Topology<{ countries: GeometryCollection }>
const world = feature(topology, topology.objects.countries) as FeatureCollection<Geometry>
const projection = geoNaturalEarth1().fitExtent([[18, 18], [WIDTH - 18, HEIGHT - 18]], world)
const path = geoPath(projection)
const COUNTRY_PATHS = world.features.map((country, index) => ({
  id: String(country.id ?? index),
  d: path(country) ?? undefined,
}))

const EVENT_COLORS: Record<RiskEventType, string> = {
  conflict: '#F6465D',
  policy: '#F0B90B',
  trade: '#F97316',
  macro: '#2EBDFF',
}

interface WorldRiskMapProps {
  events: RiskEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function WorldRiskMap({ events, selectedId, onSelect }: WorldRiskMapProps) {
  const mappedEvents = events.flatMap((event) => {
    if (event.longitude === null || event.latitude === null) return []
    const point = projection([event.longitude, event.latitude])
    return point ? [{ event, point }] : []
  })

  return (
    <div className="relative overflow-hidden bg-[#0D1117]" aria-label="글로벌 리스크 이벤트 지도">
      <svg className="h-auto w-full" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="risk-map-title">
        <title id="risk-map-title">분쟁 및 경제 뉴스 위치 지도</title>
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.56" />
            <stop offset="100%" stopColor="#0B0E11" stopOpacity="0" />
          </radialGradient>
          <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2B3139" strokeWidth="0.6" opacity="0.45" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="#0B0E11" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#mapGlow)" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#mapGrid)" />
        <g aria-hidden="true">
          {COUNTRY_PATHS.map((country) => (
            <path key={country.id} d={country.d} fill="#202630" stroke="#3A424D" strokeWidth="0.65" />
          ))}
        </g>
        <g>
          {mappedEvents.map(({ event, point }) => {
            const selected = event.id === selectedId
            const radius = 4 + event.severity * 1.25
            const color = EVENT_COLORS[event.event_type]
            return (
              <g
                key={event.id}
                role="button"
                tabIndex={0}
                aria-label={`${event.location_name ?? '위치 미상'}: ${event.title}`}
                onClick={() => onSelect(event.id)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                    keyboardEvent.preventDefault()
                    onSelect(event.id)
                  }
                }}
                className="cursor-pointer outline-none"
                transform={`translate(${point[0]} ${point[1]})`}
              >
                <circle r={selected ? radius + 8 : radius + 5} fill={color} opacity={selected ? 0.2 : 0.10} />
                <circle r={selected ? radius + 3 : radius} fill={color} stroke={selected ? '#FFFFFF' : '#0B0E11'} strokeWidth={selected ? 2 : 1.5} />
                <text x={radius + 6} y="4" fill={selected ? '#FFFFFF' : '#A7B0BC'} fontSize="9" fontWeight={selected ? 700 : 500}>{event.location_name}</text>
              </g>
            )
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-3 border border-line bg-ink/85 px-3 py-2 text-[9px] backdrop-blur">
        {(Object.entries(EVENT_COLORS) as Array<[RiskEventType, string]>).map(([type, color]) => (
          <span key={type} className="inline-flex items-center gap-1.5 text-muted"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{{ conflict: '분쟁', policy: '정책', trade: '무역', macro: '거시경제' }[type]}</span>
        ))}
      </div>
    </div>
  )
}
