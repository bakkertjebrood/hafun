import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const q = getQuery(event)
  const where: any = { marinaId: auth.marinaId }
  if (q.from) where.startAt = { gte: new Date(String(q.from)) }
  if (q.to) {
    where.startAt = { ...(where.startAt || {}), lte: new Date(String(q.to)) }
  }
  if (q.type) where.type = q.type

  return prisma.agendaEvent.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: { author: { select: { firstName: true, lastName: true, email: true } } }
  })
})
