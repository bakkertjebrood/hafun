import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 400, message: 'Naam verplicht' })

  const entry = await prisma.waitlistEntry.create({
    data: {
      marinaId: auth.marinaId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      boatLength: body.boatLength ? Number(body.boatLength) : null,
      boatWidth: body.boatWidth ? Number(body.boatWidth) : null,
      boatType: body.boatType || null,
      preferredPier: body.preferredPier || null,
      notes: body.notes || null,
      priority: body.priority ?? 0,
      status: body.status || 'waiting'
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'WaitlistEntry', entityId: entry.id, action: 'create', diff: entry })
  return entry
})
