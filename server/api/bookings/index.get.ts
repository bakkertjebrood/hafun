import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const query = getQuery(event)
  const status = query.status as string | undefined
  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined

  const where: any = { marinaId: auth.marinaId }
  if (status) where.status = status
  if (dateFrom || dateTo) {
    where.dateFrom = {}
    if (dateFrom) where.dateFrom.gte = new Date(dateFrom)
    if (dateTo) where.dateFrom.lte = new Date(dateTo)
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      berth: { select: { id: true, code: true, pier: true } },
      customer: { select: { id: true, name: true, email: true } },
      guest: { select: { id: true, name: true, boatName: true } },
      boat: { select: { id: true, name: true, type: true, length: true } }
    },
    orderBy: { dateFrom: 'desc' },
    take: 100
  })

  return bookings
})
