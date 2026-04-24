import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const marinaId = query.marinaId as string
  const date = query.date ? new Date(String(query.date)) : null

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  const marina = await prisma.marina.findUnique({
    where: { id: marinaId },
    select: { id: true, name: true, gpsLat: true, gpsLng: true }
  })

  const berths = await prisma.berth.findMany({
    where: { marinaId },
    select: {
      id: true,
      code: true,
      pier: true,
      length: true,
      width: true,
      status: true,
      isPassanten: true,
      gpsLat: true,
      gpsLng: true,
      side: true,
      customer: { select: { name: true } },
      boat: { select: { name: true } }
    },
    orderBy: [{ pier: 'asc' }, { code: 'asc' }]
  })

  // Actieve notes per berth (voor "Melding" status)
  const notes = await prisma.note.groupBy({
    by: ['berthId'],
    where: { marinaId, berthId: { not: null } },
    _count: true
  })
  const noteCounts: Record<string, number> = {}
  for (const n of notes) {
    if (n.berthId) noteCounts[n.berthId] = n._count
  }

  // Als datum opgegeven → bepaal per berth of er een booking actief is op die dag
  let activeBookingByBerth: Record<string, any> = {}
  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0)
    const end = new Date(date); end.setHours(23, 59, 59, 999)
    const bookings = await prisma.booking.findMany({
      where: {
        marinaId,
        dateFrom: { lte: end },
        dateTo: { gte: start },
        status: { in: ['reserved', 'checked_in'] }
      },
      select: {
        berthId: true,
        status: true,
        guest: { select: { name: true } },
        customer: { select: { name: true } }
      }
    })
    for (const b of bookings) activeBookingByBerth[b.berthId] = b
  }

  const enriched = berths.map(b => {
    const booking = activeBookingByBerth[b.id]
    const hasNote = (noteCounts[b.id] || 0) > 0
    // Afleiden van een "visueel" status voor de kaart
    let displayStatus: string = b.status
    if (date && booking) {
      displayStatus = b.isPassanten ? 'PASSANT' : 'OCCUPIED'
    }
    if (hasNote && !date) displayStatus = 'MELDING'
    return {
      ...b,
      displayStatus,
      hasNote,
      activeBooking: booking ? {
        status: booking.status,
        name: booking.customer?.name || booking.guest?.name
      } : null
    }
  })

  const counts = {
    FREE: 0,
    OCCUPIED: 0,
    PASSANT: 0,
    SEASONAL: 0,
    STORAGE: 0,
    TEMPORARY: 0,
    EMPTY: 0,
    RELOCATED: 0,
    MELDING: 0
  }

  for (const b of enriched) {
    const key = b.displayStatus as keyof typeof counts
    if (counts[key] !== undefined) counts[key]++
  }

  return { marina, berths: enriched, counts, date: date?.toISOString() || null }
})
