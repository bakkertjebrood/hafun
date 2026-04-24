import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const q = getQuery(event)
  const where: any = { marinaId: auth.marinaId }
  if (q.status) where.status = q.status
  if (q.assigneeId) where.assigneeId = q.assigneeId

  return prisma.workOrder.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      customer: { select: { id: true, name: true } },
      boat: { select: { id: true, name: true, length: true } },
      berth: { select: { id: true, code: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  })
})
