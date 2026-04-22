import { prisma } from '../../utils/prisma'

const R = 6371000

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Bearing from point A to point B in degrees (0 = north, 90 = east)
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function moveByBearing(lat: number, lng: number, brng: number, distMeters: number): [number, number] {
  const d = distMeters / R
  const φ1 = lat * Math.PI / 180
  const λ1 = lng * Math.PI / 180
  const θ = brng * Math.PI / 180
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(θ))
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2))
  return [φ2 * 180 / Math.PI, λ2 * 180 / Math.PI]
}

// Returns { lat, lng, tangent } at fraction t along a polyline (by distance)
function sampleLine(points: number[][], t: number): { lat: number, lng: number, tangent: number } {
  const clamped = Math.max(0, Math.min(1, t))
  const segLengths: number[] = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const d = haversine(points[i - 1]![0]!, points[i - 1]![1]!, points[i]![0]!, points[i]![1]!)
    segLengths.push(d)
    total += d
  }
  if (total === 0) {
    return { lat: points[0]![0]!, lng: points[0]![1]!, tangent: 0 }
  }
  const target = clamped * total
  let accum = 0
  for (let i = 0; i < segLengths.length; i++) {
    const seg = segLengths[i]!
    if (accum + seg >= target || i === segLengths.length - 1) {
      const local = seg > 0 ? (target - accum) / seg : 0
      const a = points[i]!
      const b = points[i + 1]!
      const lat = a[0]! + (b[0]! - a[0]!) * local
      const lng = a[1]! + (b[1]! - a[1]!) * local
      const tangent = bearing(a[0]!, a[1]!, b[0]!, b[1]!)
      return { lat, lng, tangent }
    }
    accum += seg
  }
  const last = points[points.length - 1]!
  const prev = points[points.length - 2]!
  return { lat: last[0]!, lng: last[1]!, tangent: bearing(prev[0]!, prev[1]!, last[0]!, last[1]!) }
}

// Extract numeric part from a berth code ("A01-12m" -> 1, "B-KOP-3" -> 3)
function berthNumber(code: string): number {
  const m = code.match(/(\d+)/)
  return m ? parseInt(m[1]!, 10) : 0
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const marinaId = body.marinaId
  const pierNames: string[] | undefined = Array.isArray(body.pierNames) ? body.pierNames : undefined
  const onlyUnpositioned: boolean = !!body.onlyUnpositioned

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  const pierLines = await prisma.pierLine.findMany({
    where: {
      marinaId,
      ...(pierNames?.length ? { name: { in: pierNames } } : {})
    },
    orderBy: { name: 'asc' }
  })

  if (!pierLines.length) {
    throw createError({ statusCode: 400, message: 'Geen steigers getekend. Teken eerst steigers op de kaart.' })
  }

  const berths = await prisma.berth.findMany({
    where: { marinaId },
    orderBy: [{ pier: 'asc' }, { code: 'asc' }]
  })

  let positioned = 0

  for (const pier of pierLines) {
    const points = (pier.points as number[][] | null) ?? []
    const headPoints = pier.headPoints as number[][] | null
    const pierBerths = berths.filter(b => b.pier === pier.name)
    if (!pierBerths.length || points.length < 2) continue

    const offsetMeters = pier.berthOffset ?? 3.5

    const headBerths = pierBerths
      .filter(b => b.side === 'HEAD' || b.code.toUpperCase().includes('KOP'))
      .sort((a, b) => berthNumber(a.code) - berthNumber(b.code))

    const mainBerths = pierBerths
      .filter(b => !(b.side === 'HEAD' || b.code.toUpperCase().includes('KOP')))
      .sort((a, b) => berthNumber(a.code) - berthNumber(b.code))

    // Auto-assign side if missing: split by number - lower half LEFT, upper half RIGHT
    const halfway = Math.ceil(mainBerths.length / 2)
    const sides: ('LEFT' | 'RIGHT')[] = mainBerths.map((b, i) => {
      if (b.side === 'LEFT' || b.side === 'RIGHT') return b.side
      return i < halfway ? 'LEFT' : 'RIGHT'
    })

    const leftIdx = sides.map((s, i) => s === 'LEFT' ? i : -1).filter(i => i >= 0)
    const rightIdx = sides.map((s, i) => s === 'RIGHT' ? i : -1).filter(i => i >= 0)

    async function place(idxList: number[], side: 'LEFT' | 'RIGHT') {
      if (!idxList.length) return
      // Space berths evenly along the pier for this side, with margin at the ends
      const n = idxList.length
      for (let k = 0; k < n; k++) {
        const berth = mainBerths[idxList[k]!]!
        if (onlyUnpositioned && berth.gpsLat != null && berth.gpsLng != null && berth.side) continue
        const t = n === 1 ? 0.5 : (k + 0.5) / n
        const { lat, lng, tangent } = sampleLine(points, t)
        // Perpendicular bearing: LEFT = tangent - 90, RIGHT = tangent + 90
        const perp = ((side === 'LEFT' ? tangent - 90 : tangent + 90) + 360) % 360
        const [plat, plng] = moveByBearing(lat, lng, perp, offsetMeters)
        await prisma.berth.update({
          where: { id: berth.id },
          data: { gpsLat: plat, gpsLng: plng, side }
        })
        positioned++
      }
    }

    await place(leftIdx, 'LEFT')
    await place(rightIdx, 'RIGHT')

    // T-head berths: spread along the head line, no offset (they ARE the head)
    if (headPoints && headPoints.length >= 2 && headBerths.length > 0) {
      for (let i = 0; i < headBerths.length; i++) {
        const berth = headBerths[i]!
        if (onlyUnpositioned && berth.gpsLat != null && berth.gpsLng != null && berth.side === 'HEAD') continue
        const t = headBerths.length === 1 ? 0.5 : (i + 0.5) / headBerths.length
        const { lat, lng } = sampleLine(headPoints, t)
        await prisma.berth.update({
          where: { id: berth.id },
          data: { gpsLat: lat, gpsLng: lng, side: 'HEAD' }
        })
        positioned++
      }
    }
  }

  return { positioned, piers: pierLines.map(p => p.name) }
})
