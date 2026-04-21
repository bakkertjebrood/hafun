import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const marinaId = query.marinaId as string

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  const where: Record<string, unknown> = { marinaId }

  if (query.pier) {
    where.pier = query.pier
  }
  if (query.status) {
    where.status = query.status
  }

  const berths = await prisma.berth.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, contractType: true } },
      boat: { select: { id: true, name: true, type: true, length: true, width: true } },
      notes: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { author: { select: { firstName: true, lastName: true } } }
      },
      _count: { select: { bookings: true, notes: true } }
    },
    orderBy: [{ pier: 'asc' }, { code: 'asc' }]
  })

  return berths
})
