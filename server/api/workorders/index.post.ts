import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  if (!body.title) throw createError({ statusCode: 400, message: 'Titel verplicht' })

  const year = new Date().getFullYear()
  const count = await prisma.workOrder.count({ where: { marinaId: auth.marinaId } })
  const number = `WB-${year}-${String(count + 1).padStart(4, '0')}`

  const wo = await prisma.workOrder.create({
    data: {
      marinaId: auth.marinaId,
      customerId: body.customerId || null,
      boatId: body.boatId || null,
      berthId: body.berthId || null,
      number,
      title: body.title,
      description: body.description || null,
      priority: body.priority || 'normal',
      status: body.status || 'open',
      assigneeId: body.assigneeId || null,
      lines: Array.isArray(body.lines) ? body.lines : undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'WorkOrder', entityId: wo.id, action: 'create' })
  return wo
})
