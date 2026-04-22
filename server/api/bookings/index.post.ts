import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)

  if (!body.berthId || !body.dateFrom || !body.dateTo) {
    throw createError({ statusCode: 400, message: 'berthId, dateFrom en dateTo zijn verplicht' })
  }

  // Check berth belongs to this marina
  const berth = await prisma.berth.findFirst({
    where: { id: body.berthId, marinaId: auth.marinaId }
  })
  if (!berth) throw createError({ statusCode: 404, message: 'Ligplaats niet gevonden' })

  // Check for overlap
  const overlap = await prisma.booking.findFirst({
    where: {
      berthId: body.berthId,
      status: { not: 'cancelled' },
      dateFrom: { lt: new Date(body.dateTo) },
      dateTo: { gt: new Date(body.dateFrom) }
    }
  })
  if (overlap) throw createError({ statusCode: 409, message: 'Er is al een boeking op deze plek in deze periode' })

  const booking = await prisma.booking.create({
    data: {
      marinaId: auth.marinaId,
      berthId: body.berthId,
      customerId: body.customerId || null,
      guestId: body.guestId || null,
      boatId: body.boatId || null,
      dateFrom: new Date(body.dateFrom),
      dateTo: new Date(body.dateTo),
      status: body.status || 'reserved',
      persons: body.persons || 1
    },
    include: {
      berth: { select: { code: true } },
      customer: { select: { name: true } },
      guest: { select: { name: true } }
    }
  })

  return booking
})
