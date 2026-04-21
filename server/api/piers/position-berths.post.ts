import { prisma } from '../../utils/prisma'

// Calculate distance between two GPS points (in meters)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Interpolate along a polyline at fraction t (0-1)
function interpolatePolyline(points: number[][], t: number): [number, number] {
  if (points.length < 2) return [points[0][0], points[0][1]]
  if (t <= 0) return [points[0][0], points[0][1]]
  if (t >= 1) return [points[points.length - 1][0], points[points.length - 1][1]]

  // Calculate total length and segment lengths
  const segLengths: number[] = []
  let totalLength = 0
  for (let i = 1; i < points.length; i++) {
    const d = haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    segLengths.push(d)
    totalLength += d
  }

  // Find the segment and local t
  const targetDist = t * totalLength
  let accum = 0
  for (let i = 0; i < segLengths.length; i++) {
    if (accum + segLengths[i] >= targetDist) {
      const localT = (targetDist - accum) / segLengths[i]
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * localT,
        points[i][1] + (points[i + 1][1] - points[i][1]) * localT
      ]
    }
    accum += segLengths[i]
  }

  return [points[points.length - 1][0], points[points.length - 1][1]]
}

// Offset a point perpendicular to a line direction (for placing berths on both sides)
function offsetPoint(lat: number, lng: number, bearing: number, distMeters: number): [number, number] {
  const R = 6371000
  const d = distMeters / R
  const lat1 = lat * Math.PI / 180
  const lng1 = lng * Math.PI / 180
  const brng = bearing * Math.PI / 180

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng))
  const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))

  return [lat2 * 180 / Math.PI, lng2 * 180 / Math.PI]
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const marinaId = body.marinaId

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  const pierLines = await prisma.pierLine.findMany({
    where: { marinaId },
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
    const points = pier.points as number[][]
    const headPoints = pier.headPoints as number[][] | null
    const pierBerths = berths.filter(b => b.pier === pier.name)

    if (!pierBerths.length || points.length < 2) continue

    // Separate berths that go on the main line vs the T-head
    // Convention: berths with "KOP" in their code go on the head
    const headBerths = pierBerths.filter(b => b.code.toUpperCase().includes('KOP'))
    const mainBerths = pierBerths.filter(b => !b.code.toUpperCase().includes('KOP'))

    // Position main berths along the main line
    for (let i = 0; i < mainBerths.length; i++) {
      const t = mainBerths.length > 1 ? i / (mainBerths.length - 1) : 0.5
      const [lat, lng] = interpolatePolyline(points, t)

      await prisma.berth.update({
        where: { id: mainBerths[i].id },
        data: { gpsLat: lat, gpsLng: lng }
      })
      positioned++
    }

    // Position head berths along the T-head line (if drawn)
    if (headPoints && headPoints.length >= 2 && headBerths.length > 0) {
      for (let i = 0; i < headBerths.length; i++) {
        const t = headBerths.length > 1 ? i / (headBerths.length - 1) : 0.5
        const [lat, lng] = interpolatePolyline(headPoints, t)

        await prisma.berth.update({
          where: { id: headBerths[i].id },
          data: { gpsLat: lat, gpsLng: lng }
        })
        positioned++
      }
    }
  }

  return { positioned, piers: pierLines.map(p => p.name) }
})
