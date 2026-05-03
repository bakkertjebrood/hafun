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
      type: true,
      gpsLat: true,
      gpsLng: true,
      side: true,
      customer: { select: { id: true, name: true } },
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
  let activeAbsenceByBerth: Record<string, { releaseForRelet: boolean }> = {}
  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0)
    const end = new Date(date); end.setHours(23, 59, 59, 999)
    const [bookings, absences] = await Promise.all([
      prisma.booking.findMany({
        where: {
          marinaId,
          dateFrom: { lte: end },
          dateTo: { gte: start },
          status: { in: ['reserved', 'checked_in', 'confirmed'] }
        },
        select: {
          berthId: true,
          status: true,
          customerId: true,
          guest: { select: { name: true } },
          customer: { select: { name: true } }
        }
      }),
      prisma.berthAbsence.findMany({
        where: {
          marinaId,
          status: { not: 'cancelled' },
          dateFrom: { lte: end },
          dateTo: { gte: start }
        },
        select: { berthId: true, releaseForRelet: true }
      })
    ])
    for (const b of bookings) activeBookingByBerth[b.berthId] = b
    for (const a of absences) activeAbsenceByBerth[a.berthId] = { releaseForRelet: a.releaseForRelet }
  }

  const enriched = berths.map(b => {
    const booking = activeBookingByBerth[b.id]
    const absence = activeAbsenceByBerth[b.id]
    const hasNote = (noteCounts[b.id] || 0) > 0
    // Afleiden van een "visueel" status voor de kaart. De display-status mengt
    // de echte status (FREE/OCCUPIED/EMPTY/RELOCATED) met het type (voor lege
    // plekken laten we het type-kleur zien) en met afgeleide states als
    // PASSANT/SUBLET/MELDING/ABSENT.
    let displayStatus: string = b.status
    if (b.status === 'FREE') {
      // Lege plek: kleur op type
      displayStatus = b.type
    }
    if (date && booking) {
      // Boeking actief op deze dag
      const sublet = b.type === 'JAARPLAATS'
        && b.customer?.id != null
        && booking.customerId !== b.customer.id
      displayStatus = sublet ? 'SUBLET' : (b.type === 'PASSANT' ? 'PASSANT' : 'OCCUPIED')
    } else if (date && absence && b.type === 'JAARPLAATS') {
      // Eigenaar weg, nog niet geboekt door iemand anders
      displayStatus = 'ABSENT'
    }
    if (hasNote && !date) displayStatus = 'MELDING'
    return {
      ...b,
      displayStatus,
      hasNote,
      activeBooking: booking ? {
        status: booking.status,
        name: booking.customer?.name || booking.guest?.name
      } : null,
      activeAbsence: absence ? { releaseForRelet: absence.releaseForRelet } : null
    }
  })

  const counts: Record<string, number> = {
    JAARPLAATS: 0,
    SEIZOEN: 0,
    WINTERSTALLING: 0,
    PASSANT: 0,
    WERKPLEK: 0,
    OCCUPIED: 0,
    SUBLET: 0,
    EMPTY: 0,
    RELOCATED: 0,
    MELDING: 0,
    ABSENT: 0
  }

  for (const b of enriched) {
    const key = b.displayStatus
    if (typeof counts[key] === 'number') counts[key] = (counts[key] ?? 0) + 1
  }

  return { marina, berths: enriched, counts, date: date?.toISOString() || null }
})
