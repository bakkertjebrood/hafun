import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const marinaId = query.marinaId as string

  if (!marinaId) {
    throw createError({ statusCode: 400, message: 'marinaId is verplicht' })
  }

  return prisma.pierLine.findMany({
    where: { marinaId },
    orderBy: { name: 'asc' }
  })
})
