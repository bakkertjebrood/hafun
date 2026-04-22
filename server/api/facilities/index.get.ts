import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const query = getQuery(event)
  const marinaId = (query.marinaId as string) || auth.marinaId

  if (marinaId !== auth.marinaId && auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Niet toegestaan' })
  }

  return prisma.facility.findMany({
    where: { marinaId },
    orderBy: { createdAt: 'asc' }
  })
})
