import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const marinaId = query.marinaId as string

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  const boats = await prisma.boat.findMany({
    where: { marinaId },
    include: {
      customer: { select: { id: true, name: true } },
      berths: { select: { id: true, code: true } }
    },
    orderBy: { name: 'asc' }
  })

  return boats
})
