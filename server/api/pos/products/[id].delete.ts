import { prisma } from '../../../utils/prisma'
import { getAuthUser } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const existing = await prisma.posProduct.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  await prisma.posProduct.update({ where: { id }, data: { active: false } })
  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'PosProduct', entityId: id, action: 'delete' })
  return { ok: true }
})
