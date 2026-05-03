import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

const R = 6371000

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface ClosestSegment {
  distance: number
  segmentStart: number[]
  segmentEnd: number[]
  fraction: number
  isHead: boolean
}

function projectToSegment(p: number[], a: number[], b: number[]): { distance: number, fraction: number } {
  const cosLat = Math.cos(p[0]! * Math.PI / 180)
  const ax = a[1]! * cosLat
  const ay = a[0]!
  const bx = b[1]! * cosLat
  const by = b[0]!
  const px = p[1]! * cosLat
  const py = p[0]!
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
  const projLat = a[0]! + (b[0]! - a[0]!) * t
  const projLng = a[1]! + (b[1]! - a[1]!) * t
  return { distance: haversine(p[0]!, p[1]!, projLat, projLng), fraction: t }
}

function closestOnPolyline(p: number[], points: number[][], isHead: boolean): ClosestSegment | null {
  if (points.length < 2) return null
  let best: ClosestSegment | null = null
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const r = projectToSegment(p, a, b)
    if (!best || r.distance < best.distance) {
      best = { distance: r.distance, segmentStart: a, segmentEnd: b, fraction: r.fraction, isHead }
    }
  }
  return best
}

// Side relative to direction A→B. Negative cross = LEFT, positive = RIGHT.
function sideOfSegment(p: number[], a: number[], b: number[]): 'LEFT' | 'RIGHT' {
  const cosLat = Math.cos(p[0]! * Math.PI / 180)
  const ax = a[1]! * cosLat
  const ay = a[0]!
  const bx = b[1]! * cosLat
  const by = b[0]!
  const px = p[1]! * cosLat
  const py = p[0]!
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
  return cross > 0 ? 'LEFT' : 'RIGHT'
}

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  const marinaId: string = body.marinaId
  const gpsLat = Number(body.gpsLat)
  const gpsLng = Number(body.gpsLng)
  const length = Math.max(2, Math.min(60, Number(body.length) || 10))
  const width = Math.max(1, Math.min(20, Number(body.width) || 3.5))
  const isPassanten = !!body.isPassanten

  if (!marinaId || !Number.isFinite(gpsLat) || !Number.isFinite(gpsLng)) {
    throw createError({ statusCode: 400, message: 'marinaId, gpsLat en gpsLng zijn verplicht' })
  }

  const piers = await prisma.pierLine.findMany({ where: { marinaId } })
  if (piers.length === 0) {
    throw createError({ statusCode: 400, message: 'Teken eerst een steiger voordat je ligplaatsen toevoegt' })
  }

  const click = [gpsLat, gpsLng]
  let bestPier: typeof piers[0] | null = null
  let bestMatch: ClosestSegment | null = null

  for (const pier of piers) {
    const main = (pier.points as unknown as number[][]) || []
    const head = (pier.headPoints as unknown as number[][]) || []
    const candidates: ClosestSegment[] = []
    const onMain = closestOnPolyline(click, main, false)
    const onHead = head.length >= 2 ? closestOnPolyline(click, head, true) : null
    if (onMain) candidates.push(onMain)
    if (onHead) candidates.push(onHead)
    for (const c of candidates) {
      if (!bestMatch || c.distance < bestMatch.distance) {
        bestMatch = c
        bestPier = pier
      }
    }
  }

  if (!bestPier || !bestMatch) {
    throw createError({ statusCode: 400, message: 'Geen steiger gevonden in de buurt' })
  }
  if (bestMatch.distance > 100) {
    throw createError({ statusCode: 400, message: `Te ver van de dichtstbijzijnde steiger (${Math.round(bestMatch.distance)}m). Plaats dichter bij een steiger.` })
  }

  const side: 'LEFT' | 'RIGHT' | 'HEAD' = bestMatch.isHead
    ? 'HEAD'
    : sideOfSegment(click, bestMatch.segmentStart, bestMatch.segmentEnd)

  const existingCount = await prisma.berth.count({ where: { marinaId, pier: bestPier.name } })
  const prefix = side === 'HEAD' ? `${bestPier.name}-KOP` : bestPier.name
  const seq = existingCount + 1
  const code = side === 'HEAD'
    ? `${prefix}-${seq}-${length}m`
    : `${prefix}${String(seq).padStart(2, '0')}-${length}m`

  const berth = await prisma.berth.create({
    data: {
      marinaId,
      pier: bestPier.name,
      code,
      length,
      width,
      isPassanten,
      side,
      gpsLat,
      gpsLng,
      status: 'FREE'
    }
  })

  return berth
})
