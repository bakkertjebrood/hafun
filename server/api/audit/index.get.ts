import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })
  if (auth.role !== 'ADMIN' && auth.role !== 'HARBORMASTER') {
    throw createError({ statusCode: 403, message: 'Geen toegang' })
  }

  const q = getQuery(event)
  const where: any = { marinaId: auth.marinaId }
  if (q.entity) where.entity = q.entity
  if (q.action) where.action = q.action
  if (q.userId) where.userId = q.userId

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Number(q.limit) || 100,
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
  })

  return logs
})
