import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const existing = await prisma.quote.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  await prisma.quote.delete({ where: { id } })
  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'Quote', entityId: id, action: 'delete' })
  return { ok: true }
})
