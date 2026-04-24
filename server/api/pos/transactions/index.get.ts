import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const q = getQuery(event)
  const where: any = { marinaId: auth.marinaId }
  if (q.from) where.createdAt = { gte: new Date(String(q.from)) }
  if (q.to) where.createdAt = { ...(where.createdAt || {}), lte: new Date(String(q.to)) }

  return prisma.posTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Number(q.limit) || 100
  })
})
