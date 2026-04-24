import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const existing = await prisma.workOrder.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  const newStatus = body.status ?? existing.status
  const completedAt = newStatus === 'done' && existing.status !== 'done' ? new Date() : existing.completedAt

  const updated = await prisma.workOrder.update({
    where: { id },
    data: {
      customerId: body.customerId ?? existing.customerId,
      boatId: body.boatId ?? existing.boatId,
      berthId: body.berthId ?? existing.berthId,
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      priority: body.priority ?? existing.priority,
      status: newStatus,
      assigneeId: body.assigneeId ?? existing.assigneeId,
      lines: body.lines !== undefined ? body.lines : (existing.lines as any),
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : existing.scheduledAt,
      completedAt
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'WorkOrder', entityId: id, action: 'update' })
  return updated
})
