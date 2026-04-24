import { prisma } from '../../utils/prisma'
import { getAuthUser } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const auth = getAuthUser(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Niet ingelogd' })

  const body = await readBody(event)
  if (!body.title || !body.startAt) throw createError({ statusCode: 400, message: 'Titel en startdatum verplicht' })

  const ev = await prisma.agendaEvent.create({
    data: {
      marinaId: auth.marinaId,
      authorId: auth.userId,
      title: body.title,
      description: body.description || null,
      type: body.type || 'OTHER',
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      allDay: !!body.allDay,
      location: body.location || null
    }
  })

  await logAudit({ marinaId: auth.marinaId, userId: auth.userId, entity: 'AgendaEvent', entityId: ev.id, action: 'create' })
  return ev
})
