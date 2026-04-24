import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const marinaId = auth.marinaId
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  // ─── KPI's ───────────────────────────

  const totalBerths = await prisma.berth.count({ where: { marinaId } })
  const occupiedBerths = await prisma.berth.count({
    where: { marinaId, status: { in: ['OCCUPIED', 'SEASONAL', 'TEMPORARY'] } }
  })
  const occupancyPercent = totalBerths > 0 ? Math.round((occupiedBerths / totalBerths) * 100) : 0

  // Check-ins today
  const checkInsToday = await prisma.booking.count({
    where: {
      marinaId,
      dateFrom: { gte: today, lt: tomorrow },
      status: { not: 'cancelled' }
    }
  })

  // Outstanding invoices
  const openInvoices = await prisma.invoice.findMany({
    where: { marinaId, status: { in: ['open', 'partial'] } },
    select: { total: true, paidAmount: true }
  })
  const outstandingAmount = openInvoices.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0)
  const openInvoiceCount = openInvoices.length

  // Passanten this week
  const passantenWeek = await prisma.guest.count({
    where: {
      marinaId,
      arrival: { gte: weekAgo }
    }
  })

  // ─── Today schedule ──────────────────

  const arrivalsToday = await prisma.booking.findMany({
    where: {
      marinaId,
      dateFrom: { gte: today, lt: tomorrow },
      status: { not: 'cancelled' }
    },
    include: {
      berth: { select: { code: true, pier: true } },
      customer: { select: { name: true } },
      guest: { select: { name: true, boatName: true } },
      boat: { select: { name: true } }
    },
    orderBy: { dateFrom: 'asc' }
  })

  const departuresToday = await prisma.booking.findMany({
    where: {
      marinaId,
      dateTo: { gte: today, lt: tomorrow },
      status: { in: ['checked_in', 'reserved'] }
    },
    include: {
      berth: { select: { code: true, pier: true } },
      customer: { select: { name: true } },
      guest: { select: { name: true, boatName: true } },
      boat: { select: { name: true } }
    },
    orderBy: { dateTo: 'asc' }
  })

  const schedule = [
    ...arrivalsToday.map(b => ({
      id: b.id,
      time: new Date(b.dateFrom).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      name: b.customer?.name || b.guest?.name || 'Onbekend',
      kind: 'Aankomst',
      slot: b.berth?.code || '?',
      status: b.status === 'checked_in' ? 'bevestigd' : 'onderweg',
      bookingId: b.id
    })),
    ...departuresToday.map(b => ({
      id: b.id,
      time: new Date(b.dateTo).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      name: b.customer?.name || b.guest?.name || 'Onbekend',
      kind: 'Vertrek',
      slot: b.berth?.code || '?',
      status: 'ingepland',
      bookingId: b.id
    }))
  ].sort((a, b) => a.time.localeCompare(b.time))

  // ─── Recent notifications ────────────

  const recentNotes = await prisma.note.findMany({
    where: { marinaId },
    include: {
      author: { select: { firstName: true, lastName: true } },
      berth: { select: { code: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  const notifications = recentNotes.map(n => ({
    id: n.id,
    title: n.text.length > 50 ? n.text.slice(0, 50) + '...' : n.text,
    sub: `${n.author.firstName} ${n.author.lastName}${n.berth ? ' · ' + n.berth.code : ''}`,
    color: '#00A9A5',
    createdAt: n.createdAt
  }))

  // Add overdue invoice alerts
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      marinaId,
      status: { in: ['open', 'partial'] },
      dueDate: { lt: today }
    },
    include: { customer: { select: { name: true } } },
    take: 3
  })

  for (const inv of overdueInvoices) {
    notifications.unshift({
      id: inv.id,
      title: `Factuur ${inv.number} verlopen`,
      sub: `${inv.customer?.name || 'Onbekend'} · €${(inv.total - inv.paidAmount).toFixed(0)}`,
      color: '#EF4444',
      createdAt: inv.dueDate || inv.createdAt
    })
  }

  // ─── Occupancy chart (14 days) ───────

  const occupancyData: number[] = []
  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - 7 + i)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    // Count bookings active on this date
    const activeBookings = await prisma.booking.count({
      where: {
        marinaId,
        status: { not: 'cancelled' },
        dateFrom: { lte: nextDate },
        dateTo: { gte: date }
      }
    })

    // Add permanent occupants (berths with status OCCUPIED/SEASONAL)
    const permanentOccupied = occupiedBerths
    const totalActive = Math.min(activeBookings + permanentOccupied, totalBerths)
    const pct = totalBerths > 0 ? Math.round((totalActive / totalBerths) * 100) : 0
    occupancyData.push(Math.min(pct, 100))
  }

  return {
    kpis: {
      occupancy: occupancyPercent,
      checkIns: checkInsToday,
      outstanding: outstandingAmount,
      openInvoices: openInvoiceCount,
      passanten: passantenWeek
    },
    schedule,
    notifications: notifications.slice(0, 5),
    occupancyChart: occupancyData
  }
})
