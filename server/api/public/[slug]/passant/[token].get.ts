import { requireMarinaPublic } from '../../../../utils/marinaContext'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const marina = await requireMarinaPublic(event)
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 404, message: 'Niet gevonden' })

  const guest = await prisma.guest.findFirst({
    where: { marinaId: marina.id, checkinToken: token },
    include: {
      bookings: {
        include: { berth: { select: { code: true, pier: true } } },
        orderBy: { dateFrom: 'asc' }
      }
    }
  })
  if (!guest) throw createError({ statusCode: 404, message: 'Niet gevonden' })

  return {
    marinaName: marina.name,
    name: guest.name,
    boatName: guest.boatName,
    boatLength: guest.boatLength,
    arrival: guest.arrival,
    departure: guest.departure,
    persons: guest.persons,
    paymentStatus: guest.paymentStatus,
    bookings: guest.bookings.map(b => ({
      id: b.id,
      dateFrom: b.dateFrom,
      dateTo: b.dateTo,
      status: b.status,
      berth: b.berth ? { code: b.berth.code, pier: b.berth.pier } : null
    }))
  }
})
