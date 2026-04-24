import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const existing = await prisma.agendaEvent.findFirst({ where: { id, marinaId: auth.marinaId } })
  if (!existing) throw createError({ statusCode: 404 })

  const updated = await prisma.agendaEvent.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      type: body.type ?? existing.type,
      startAt: body.startAt ? new Date(body.startAt) : existing.startAt,
      endAt: body.endAt ? new Date(body.endAt) : existing.endAt,
      allDay: body.allDay ?? existing.allDay,
      location: body.location ?? existing.location
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'AgendaEvent', entityId: id, action: 'update' })
  return updated
})
