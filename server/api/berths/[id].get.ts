import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const berth = await prisma.berth.findUnique({
    where: { id },
    include: {
      customer: true,
      boat: true,
      notes: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: { select: { firstName: true, lastName: true } } }
      },
      bookings: {
        orderBy: { dateFrom: 'desc' },
        take: 5,
        include: {
          customer: { select: { name: true } },
          guest: { select: { name: true } }
        }
      }
    }
  })

  if (!berth) {
    throw createError({ statusCode: 404, message: 'Ligplaats niet gevonden' })
  }

  return berth
})
