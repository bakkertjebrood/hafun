import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const invoice = await prisma.invoice.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!invoice) throw createError({ statusCode: 404 })

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      reminderCount: { increment: 1 },
      lastReminder: new Date()
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'Invoice', entityId: id, action: 'reminder' })
  return updated
})
