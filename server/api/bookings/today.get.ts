import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Arrivals today: bookings starting today
  const arrivals = await prisma.booking.findMany({
    where: {
      marinaId: auth.marinaId,
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

  // Departures today: bookings ending today
  const departures = await prisma.booking.findMany({
    where: {
      marinaId: auth.marinaId,
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

  // Current occupancy
  const currentGuests = await prisma.booking.count({
    where: {
      marinaId: auth.marinaId,
      status: 'checked_in',
      dateFrom: { lte: new Date() },
      dateTo: { gte: new Date() }
    }
  })

  return { arrivals, departures, currentGuests }
})
