import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const existing = await prisma.agendaEvent.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  await prisma.agendaEvent.delete({ where: { id } })
  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'AgendaEvent', entityId: id, action: 'delete' })
  return { ok: true }
})
