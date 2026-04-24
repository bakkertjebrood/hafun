import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const existing = await prisma.waitlistEntry.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  const updated = await prisma.waitlistEntry.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      email: body.email ?? existing.email,
      phone: body.phone ?? existing.phone,
      boatLength: body.boatLength !== undefined ? Number(body.boatLength) : existing.boatLength,
      boatWidth: body.boatWidth !== undefined ? Number(body.boatWidth) : existing.boatWidth,
      boatType: body.boatType ?? existing.boatType,
      preferredPier: body.preferredPier ?? existing.preferredPier,
      notes: body.notes ?? existing.notes,
      priority: body.priority ?? existing.priority,
      status: body.status ?? existing.status
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'WaitlistEntry', entityId: id, action: 'update', diff: { before: existing, after: updated } })
  return updated
})
