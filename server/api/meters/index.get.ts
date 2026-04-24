import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const q = getQuery(event)
  const where: any = { marinaId: auth.marinaId }
  if (q.berthId) where.berthId = q.berthId
  if (q.type) where.type = q.type

  return prisma.meterReading.findMany({
    where,
    orderBy: { readAt: 'desc' },
    take: Number(q.limit) || 200,
    include: {
      berth: { select: { id: true, code: true } },
      customer: { select: { id: true, name: true } }
    }
  })
})
