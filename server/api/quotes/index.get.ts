import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const q = getQuery(event)
  const where: any = { marinaId: auth.marinaId }
  if (q.status) where.status = q.status

  return prisma.quote.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { customer: { select: { id: true, name: true, email: true } } }
  })
})
