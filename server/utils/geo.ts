// Geo helpers for converting between map-image pixel space and GPS, plus
// post-processing utilities used by the AI berth detection pipeline.
//
// We use a simple linear interpolation between known map bounds (north, south,
// east, west) and the image dimensions. At city zoom levels (16-19) on a
// Leaflet/Web Mercator viewport this is accurate to well under a meter, which
// is more than enough for berth placement.

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface PixelPoint {
  x: number
  y: number
}

export function pixelToGps(
  x: number,
  y: number,
  bounds: MapBounds,
  width: number,
  height: number
): { lat: number, lng: number } {
  const fx = Math.max(0, Math.min(1, x / Math.max(1, width)))
  const fy = Math.max(0, Math.min(1, y / Math.max(1, height)))
  const lng = bounds.west + (bounds.east - bounds.west) * fx
  const lat = bounds.north + (bounds.south - bounds.north) * fy
  return { lat, lng }
}

export function gpsToPixel(
  lat: number,
  lng: number,
  bounds: MapBounds,
  width: number,
  height: number
): PixelPoint {
  const fx = (lng - bounds.west) / Math.max(1e-9, bounds.east - bounds.west)
  const fy = (lat - bounds.north) / Math.max(1e-9, bounds.south - bounds.north)
  return { x: fx * width, y: fy * height }
}

const EARTH_RADIUS_M = 6371000

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function metersPerPixel(bounds: MapBounds, width: number): number {
  const midLat = (bounds.north + bounds.south) / 2
  const widthMeters = haversine(midLat, bounds.west, midLat, bounds.east)
  return widthMeters / Math.max(1, width)
}

export interface RawPier {
  name: string
  start: PixelPoint
  end: PixelPoint
  leftBerths?: number
  rightBerths?: number
  hasHead?: boolean
  headStart?: PixelPoint | null
  headEnd?: PixelPoint | null
  headBerths?: number
  avgBerthLength?: number
  avgBerthWidth?: number
  confidence?: number
}

export interface ConvertedPier {
  name: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  leftBerths: number
  rightBerths: number
  hasHead: boolean
  headStartLat?: number
  headStartLng?: number
  headEndLat?: number
  headEndLng?: number
  headBerths: number
  avgBerthLength: number
  avgBerthWidth: number
  confidence: number
  lengthMeters: number
}

const MIN_CONFIDENCE = 0.65
const MIN_PIER_LENGTH_M = 5
const MAX_PIER_LENGTH_M = 500
const SNAP_DISTANCE_M = 5

export function convertAndValidate(
  piers: RawPier[],
  bounds: MapBounds,
  width: number,
  height: number
): { piers: ConvertedPier[], warnings: string[] } {
  const warnings: string[] = []
  const converted: ConvertedPier[] = []

  for (const p of piers) {
    const conf = typeof p.confidence === 'number' ? p.confidence : 0.7
    if (conf < MIN_CONFIDENCE) {
      warnings.push(`Steiger ${p.name} overgeslagen (lage zekerheid: ${conf.toFixed(2)})`)
      continue
    }
    if (!p.start || !p.end) {
      warnings.push(`Steiger ${p.name} overgeslagen (ontbrekende eindpunten)`)
      continue
    }

    const a = pixelToGps(p.start.x, p.start.y, bounds, width, height)
    const b = pixelToGps(p.end.x, p.end.y, bounds, width, height)
    const lengthM = haversine(a.lat, a.lng, b.lat, b.lng)

    if (lengthM < MIN_PIER_LENGTH_M || lengthM > MAX_PIER_LENGTH_M) {
      warnings.push(`Steiger ${p.name} overgeslagen (lengte ${lengthM.toFixed(0)}m buiten bereik)`)
      continue
    }

    const item: ConvertedPier = {
      name: p.name || '?',
      startLat: a.lat,
      startLng: a.lng,
      endLat: b.lat,
      endLng: b.lng,
      leftBerths: clampInt(p.leftBerths, 0, 100),
      rightBerths: clampInt(p.rightBerths, 0, 100),
      hasHead: !!(p.hasHead && p.headStart && p.headEnd),
      headBerths: clampInt(p.headBerths, 0, 30),
      avgBerthLength: clampNumber(p.avgBerthLength, 4, 30, 10),
      avgBerthWidth: clampNumber(p.avgBerthWidth, 1.5, 10, 3.5),
      confidence: conf,
      lengthMeters: lengthM
    }

    if (item.hasHead && p.headStart && p.headEnd) {
      const ha = pixelToGps(p.headStart.x, p.headStart.y, bounds, width, height)
      const hb = pixelToGps(p.headEnd.x, p.headEnd.y, bounds, width, height)
      item.headStartLat = ha.lat
      item.headStartLng = ha.lng
      item.headEndLat = hb.lat
      item.headEndLng = hb.lng
    }

    converted.push(item)
  }

  // Snap nearby endpoints (e.g. AI returned slightly different coords for the
  // same physical pier head shared with a neighbour)
  for (let i = 0; i < converted.length; i++) {
    for (let j = i + 1; j < converted.length; j++) {
      snapPair(converted[i]!, converted[j]!)
    }
  }

  return { piers: converted, warnings }
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(min, Math.min(max, Math.round(n)))
}

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function snapPair(a: ConvertedPier, b: ConvertedPier): void {
  const points: Array<{ owner: 'a' | 'b', kind: 'start' | 'end', lat: number, lng: number }> = [
    { owner: 'a', kind: 'start', lat: a.startLat, lng: a.startLng },
    { owner: 'a', kind: 'end', lat: a.endLat, lng: a.endLng },
    { owner: 'b', kind: 'start', lat: b.startLat, lng: b.startLng },
    { owner: 'b', kind: 'end', lat: b.endLat, lng: b.endLng }
  ]
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i]!
      const q = points[j]!
      if (p.owner === q.owner) continue
      const d = haversine(p.lat, p.lng, q.lat, q.lng)
      if (d > 0 && d < SNAP_DISTANCE_M) {
        const mid = { lat: (p.lat + q.lat) / 2, lng: (p.lng + q.lng) / 2 }
        applyPoint(p.owner === 'a' ? a : b, p.kind, mid.lat, mid.lng)
        applyPoint(q.owner === 'a' ? a : b, q.kind, mid.lat, mid.lng)
      }
    }
  }
}

function applyPoint(pier: ConvertedPier, kind: 'start' | 'end', lat: number, lng: number): void {
  if (kind === 'start') {
    pier.startLat = lat
    pier.startLng = lng
  } else {
    pier.endLat = lat
    pier.endLng = lng
  }
}
